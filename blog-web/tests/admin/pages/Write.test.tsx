import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Write from '@admin/pages/Write'
import { compressImageForUpload } from '@admin/utils/imageCompression'
import { useAuth } from '@shared/hooks/useAuth'
import { useToast } from '@shared/hooks/useToast'

vi.mock('axios')
vi.mock('@admin/utils/imageCompression')
vi.mock('@shared/hooks/useAuth')
vi.mock('@shared/hooks/useToast')

const article = {
  id: 7,
  title: '服务器上的文章',
  content: '服务器正文',
  summary: '摘要',
  category: { id: 2, name: '后端' },
  tags: [],
  views: 0,
  createdAt: '2026-07-16T10:00:00',
  updatedAt: '2026-07-16T10:00:00',
}

const renderWrite = (entry = '/write') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/write" element={<Write />} />
      <Route path="/articles" element={<p>文章列表</p>} />
      <Route path="/" element={<p>首页</p>} />
    </Routes>
  </MemoryRouter>,
)

describe('Write', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(compressImageForUpload).mockImplementation(async (file) => file)
    vi.mocked(useAuth).mockReturnValue({
      owner: { id: 1, username: 'owner' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    })
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    })
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/categories') return Promise.resolve({ data: [{ id: 2, name: '后端' }] })
      if (url === '/api/tags') return Promise.resolve({ data: [] })
      if (url === '/api/articles/7') return Promise.resolve({ data: article })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks before restoring a local draft', async () => {
    localStorage.setItem('blog_write_draft:new', JSON.stringify({
      title: '本地草稿',
      content: '尚未同步的正文',
      savedAt: '2026-07-16T11:00:00',
    }))

    renderWrite()

    expect(await screen.findByText('发现未同步的本地草稿')).toBeInTheDocument()
    expect(screen.getByLabelText('文章标题')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: '恢复草稿' }))
    expect(screen.getByLabelText('文章标题')).toHaveValue('本地草稿')
    expect(screen.getByLabelText('文章正文')).toHaveValue('尚未同步的正文')
  })

  it('keeps new-article and edit-article local drafts isolated', async () => {
    localStorage.setItem('blog_write_draft:new', JSON.stringify({ title: '新文章草稿', content: '新文章正文' }))

    renderWrite('/write?edit=7')

    await waitFor(() => expect(screen.getByLabelText('文章标题')).toHaveValue('服务器上的文章'))
    expect(screen.queryByText('发现未同步的本地草稿')).not.toBeInTheDocument()

    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('文章标题'), { target: { value: '编辑后的标题' } })
    act(() => vi.advanceTimersByTime(2100))

    expect(JSON.parse(localStorage.getItem('blog_write_draft:edit:7') ?? '{}').title).toBe('编辑后的标题')
    expect(JSON.parse(localStorage.getItem('blog_write_draft:new') ?? '{}').title).toBe('新文章草稿')
  })

  it('saves edits through the article update endpoint', async () => {
    vi.mocked(axios.put).mockResolvedValue({ data: article })
    renderWrite('/write?edit=7')

    const saveButton = await screen.findByRole('button', { name: '保存' })
    fireEvent.change(screen.getByLabelText('文章正文'), {
      target: { value: '## 最新标题\n\n> 最新正文，包含 **加粗内容** 和 [链接](https://example.com)。' },
    })
    fireEvent.click(saveButton)

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      '/api/articles/7',
      expect.objectContaining({
        id: 7,
        title: '服务器上的文章',
        summary: '最新标题 最新正文，包含 加粗内容 和 链接。',
      }),
    ))
    expect(screen.getByText('已保存')).toBeInTheDocument()
    expect(axios.post).not.toHaveBeenCalledWith('/api/articles/draft', expect.anything())
  })

  it.each(['/write', '/write?edit=7'])(
    'returns from both editor modes to the article list: %s',
    async (entry) => {
      renderWrite(entry)

      const backLink = await screen.findByRole('link', { name: '返回文章列表' })
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '发布' })).toBeInTheDocument()
      fireEvent.click(backLink)

      expect(screen.getByText('文章列表')).toBeInTheDocument()
    },
  )

  it('flushes the latest changes when leaving before the autosave delay', async () => {
    const view = renderWrite()
    await screen.findByLabelText('文章正文')

    fireEvent.change(screen.getByLabelText('文章标题'), { target: { value: '刚刚输入的标题' } })
    fireEvent.change(screen.getByLabelText('文章正文'), { target: { value: '还没等到自动保存就离开' } })
    view.unmount()

    const saved = JSON.parse(localStorage.getItem('blog_write_draft:new') ?? '{}')
    expect(saved.title).toBe('刚刚输入的标题')
    expect(saved.content).toBe('还没等到自动保存就离开')
  })

  it('offers an edit and preview switch for narrow screens', async () => {
    renderWrite()
    await screen.findByLabelText('文章正文')

    const editButton = screen.getByRole('button', { name: '编辑' })
    const previewButton = screen.getByRole('button', { name: '预览' })
    expect(screen.getByRole('button', { name: '插入图片' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '代码块' })).toBeInTheDocument()
    expect(editButton).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(previewButton)
    expect(previewButton).toHaveAttribute('aria-pressed', 'true')
    expect(editButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('uses consistent custom menus for categories and tags', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/categories') {
        return Promise.resolve({ data: [{ id: 2, name: '后端' }, { id: 3, name: '随笔' }] })
      }
      if (url === '/api/tags') {
        return Promise.resolve({ data: [{ id: 5, name: 'AI' }, { id: 6, name: '体验' }] })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    renderWrite()

    const category = await screen.findByRole('combobox', { name: '文章分类' })
    expect(category).toHaveTextContent('后端')
    fireEvent.click(category)
    expect(category).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('option', { name: '随笔' }))
    expect(category).toHaveTextContent('随笔')
    expect(category).toHaveAttribute('aria-expanded', 'false')

    const tagPicker = screen.getByRole('combobox', { name: '添加标签' })
    fireEvent.click(tagPicker)
    fireEvent.click(screen.getByRole('option', { name: 'AI' }))
    expect(screen.getByRole('button', { name: '移除标签 AI' })).toBeInTheDocument()
    expect(tagPicker).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: '移除标签 AI' }))
    expect(screen.queryByRole('button', { name: '移除标签 AI' })).not.toBeInTheDocument()
  })

  it('keeps the Markdown cursor between paired markers when there is no selection', async () => {
    renderWrite()
    const textarea = await screen.findByLabelText<HTMLTextAreaElement>('文章正文')
    textarea.focus()
    textarea.setSelectionRange(0, 0)

    fireEvent.click(screen.getByRole('button', { name: '加粗' }))

    expect(textarea).toHaveValue('****')
    await waitFor(() => {
      expect(textarea).toHaveFocus()
      expect(textarea.selectionStart).toBe(2)
      expect(textarea.selectionEnd).toBe(2)
    })
  })

  it('selects the inserted link placeholder so typing replaces it directly', async () => {
    renderWrite()
    const textarea = await screen.findByLabelText<HTMLTextAreaElement>('文章正文')
    textarea.focus()
    textarea.setSelectionRange(0, 0)

    fireEvent.click(screen.getByRole('button', { name: '链接' }))

    expect(textarea).toHaveValue('[链接文字](https://)')
    await waitFor(() => {
      expect(textarea.selectionStart).toBe(1)
      expect(textarea.selectionEnd).toBe(5)
      expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('链接文字')
    })
  })

  it('uploads a pasted image and inserts its Markdown at the cursor', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { data: { url: '/storage/blog-images/pasted.png' } },
    })
    renderWrite()
    const textarea = await screen.findByLabelText<HTMLTextAreaElement>('文章正文')
    const image = new File(['image-bytes'], 'clipboard.png', { type: 'image/png' })
    fireEvent.change(textarea, { target: { value: '前后' } })
    textarea.setSelectionRange(1, 1)

    const pasteAllowed = fireEvent.paste(textarea, {
      clipboardData: {
        items: [{
          kind: 'file',
          type: 'image/png',
          getAsFile: () => image,
        }],
        files: [image],
      },
    })

    expect(pasteAllowed).toBe(false)
    await waitFor(() => expect(compressImageForUpload).toHaveBeenCalledWith(image))
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/upload/image',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 },
    ))
    const formData = vi.mocked(axios.post).mock.calls[0][1] as FormData
    expect(formData.get('file')).toBe(image)
    await waitFor(() => expect(textarea).toHaveValue(
      '前![clipboard.png](/storage/blog-images/pasted.png)后',
    ))
  })

  it('uploads the compressed image selected from the file picker', async () => {
    const originalImage = new File(['original-image'], 'diagram.png', { type: 'image/png' })
    const compressedImage = new File(['webp'], 'diagram.webp', { type: 'image/webp' })
    vi.mocked(compressImageForUpload).mockResolvedValue(compressedImage)
    vi.mocked(axios.post).mockResolvedValue({
      data: { data: { url: '/storage/blog-images/diagram.webp' } },
    })
    renderWrite()
    await screen.findByLabelText('文章正文')
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(fileInput).not.toBeNull()

    fireEvent.change(fileInput!, { target: { files: [originalImage] } })

    await waitFor(() => expect(compressImageForUpload).toHaveBeenCalledWith(originalImage))
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/upload/image',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 },
    ))
    const formData = vi.mocked(axios.post).mock.calls[0][1] as FormData
    expect(formData.get('file')).toBe(compressedImage)
    await waitFor(() => expect(screen.getByLabelText('文章正文')).toHaveValue(
      '![diagram.png](/storage/blog-images/diagram.webp)',
    ))
  })

  it('leaves normal text paste to the browser', async () => {
    renderWrite()
    const textarea = await screen.findByLabelText<HTMLTextAreaElement>('文章正文')

    const pasteAllowed = fireEvent.paste(textarea, {
      clipboardData: {
        items: [{
          kind: 'string',
          type: 'text/plain',
          getAsFile: () => null,
        }],
        files: [],
      },
    })

    expect(pasteAllowed).toBe(true)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('does not start publishing while a draft save begins in the same render', async () => {
    let resolveDraft!: (value: { data: Record<string, never> }) => void
    const draftRequest = new Promise<{ data: Record<string, never> }>((resolve) => {
      resolveDraft = resolve
    })
    vi.mocked(axios.post).mockImplementation((url: string) => {
      if (url === '/api/articles/draft') return draftRequest
      return Promise.reject(new Error(`Unexpected POST ${url}`))
    })

    renderWrite()
    const title = await screen.findByLabelText('文章标题')
    const content = screen.getByLabelText('文章正文')
    fireEvent.change(title, { target: { value: '同步保护' } })
    fireEvent.change(content, { target: { value: '避免保存和发布重复提交' } })
    const saveButton = screen.getByRole('button', { name: '保存' })
    const publishButton = screen.getByRole('button', { name: '发布' })

    act(() => {
      saveButton.click()
      publishButton.click()
    })

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith('/api/articles/draft', expect.objectContaining({
      title: '同步保护',
      content: '避免保存和发布重复提交',
    }))

    resolveDraft({ data: {} })
    await waitFor(() => expect(saveButton).not.toBeDisabled())
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })

  it('does not start a draft save while publishing begins in the same render', async () => {
    let resolvePublish!: (value: { data: Record<string, never> }) => void
    const publishRequest = new Promise<{ data: Record<string, never> }>((resolve) => {
      resolvePublish = resolve
    })
    vi.mocked(axios.post).mockImplementation((url: string) => {
      if (url === '/api/articles') return publishRequest
      return Promise.reject(new Error(`Unexpected POST ${url}`))
    })

    renderWrite()
    fireEvent.change(await screen.findByLabelText('文章标题'), { target: { value: '同步保护' } })
    fireEvent.change(screen.getByLabelText('文章正文'), { target: { value: '发布期间不能再存草稿' } })
    const saveButton = screen.getByRole('button', { name: '保存' })
    const publishButton = screen.getByRole('button', { name: '发布' })

    act(() => {
      publishButton.click()
      saveButton.click()
    })

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith('/api/articles', expect.objectContaining({
      title: '同步保护',
      content: '发布期间不能再存草稿',
    }))

    resolvePublish({ data: {} })
    await waitFor(() => expect(publishButton).not.toBeDisabled())
  })
})
