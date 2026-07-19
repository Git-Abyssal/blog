import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressImageForUpload } from '@admin/utils/imageCompression'

describe('compressImageForUpload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps small images unchanged', async () => {
    const image = new File(['small-image'], 'small.png', { type: 'image/png' })

    await expect(compressImageForUpload(image)).resolves.toBe(image)
  })

  it('keeps animated GIF files unchanged', async () => {
    const image = new File([new Uint8Array(1024 * 1024 + 1)], 'animation.gif', {
      type: 'image/gif',
    })
    const createBitmap = vi.fn()
    vi.stubGlobal('createImageBitmap', createBitmap)

    await expect(compressImageForUpload(image)).resolves.toBe(image)
    expect(createBitmap).not.toHaveBeenCalled()
  })

  it('resizes and converts large images to a smaller WebP file', async () => {
    const image = new File([new Uint8Array(1024 * 1024 + 1)], 'diagram.png', {
      type: 'image/png',
      lastModified: 123,
    })
    const close = vi.fn()
    const bitmap = { width: 4000, height: 2000, close } as unknown as ImageBitmap
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob([new Uint8Array(1000)], { type: 'image/webp' }))
    })

    const result = await compressImageForUpload(image)

    expect(result).not.toBe(image)
    expect(result.name).toBe('diagram.webp')
    expect(result.type).toBe('image/webp')
    expect(result.size).toBe(1000)
    expect(result.lastModified).toBe(123)
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2560, 1280)
    expect(close).toHaveBeenCalledOnce()
  })

  it('keeps the original when WebP encoding does not reduce its size', async () => {
    const image = new File([new Uint8Array(1024 * 1024 + 1)], 'photo.jpg', {
      type: 'image/jpeg',
    })
    const close = vi.fn()
    const bitmap = { width: 1200, height: 800, close } as unknown as ImageBitmap
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob([new Uint8Array(image.size)], { type: 'image/webp' }))
    })

    await expect(compressImageForUpload(image)).resolves.toBe(image)
    expect(close).toHaveBeenCalledOnce()
  })
})
