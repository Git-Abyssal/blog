import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@shared/hooks/useToast';
import type { Category, Tag, Article } from '@shared/types';
import { compressImageForUpload } from '@admin/utils/imageCompression';
import {
  Send,
  Image as ImageIcon,
  Loader2,
  X,
  Bold,
  Italic,
  Heading1,
  Quote,
  Link as LinkIcon,
  Code,
  Braces,
  List,
  ListOrdered,
  Table,
  Save,
  CheckCircle,
  AlertTriangle,
  Eye,
  PencilLine,
  ArrowLeft,
  ChevronDown,
  Check,
} from 'lucide-react';

interface LocalDraft {
  title?: string;
  content?: string;
  summary?: string;
  selectedCategoryId?: number | null;
  selectedTags?: number[];
  savedAt?: string;
}

const NEW_DRAFT_KEY = 'blog_write_draft:new';
const draftKeyFor = (articleId: number | null) =>
  articleId ? `blog_write_draft:edit:${articleId}` : NEW_DRAFT_KEY;

const createSummary = (markdown: string) => markdown
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/^\s{0,3}#{1,6}\s+/gm, '')
  .replace(/^\s{0,3}>\s?/gm, '')
  .replace(/^\s*[-+*]\s+/gm, '')
  .replace(/^\s*\d+[.)]\s+/gm, '')
  .replace(/<\/?[^>]+>/g, ' ')
  .replace(/[*_~`|]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .substring(0, 100);

interface EditorSelectOption {
  value: number;
  label: string;
}

interface EditorSelectProps {
  id: string;
  ariaLabel: string;
  value: number | null;
  placeholder: string;
  options: EditorSelectOption[];
  disabled?: boolean;
  onSelect: (value: number) => void;
}

const EditorSelect: React.FC<EditorSelectProps> = ({
  id,
  ariaLabel,
  value,
  placeholder,
  options,
  disabled = false,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = `${id}-options`;
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = containerRef.current?.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]'
    );
    const first = containerRef.current?.querySelector<HTMLElement>('[role="option"]');
    (selected ?? first)?.focus();
  }, [open]);

  const closeAndFocusTrigger = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const optionButtons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []
    );
    const currentIndex = optionButtons.indexOf(event.currentTarget);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowDown') nextIndex = Math.min(optionButtons.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = optionButtons.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndFocusTrigger();
      return;
    } else {
      return;
    }

    event.preventDefault();
    optionButtons[nextIndex]?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative min-w-0"
      onBlur={() => {
        requestAnimationFrame(() => {
          if (!containerRef.current?.contains(document.activeElement)) setOpen(false);
        });
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex h-11 max-w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-sm font-medium text-slate-700 outline-none transition-[border-color,box-shadow,background-color] hover:border-slate-400 focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 ${
          open
            ? 'border-brand-blue ring-4 ring-blue-500/10'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute start-0 top-[calc(100%+0.375rem)] z-50 max-h-60 min-w-full w-max max-w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-800"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onKeyDown={handleOptionKeyDown}
                onClick={() => {
                  onSelect(option.value);
                  closeAndFocusTrigger();
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue ${
                  selected
                    ? 'bg-blue-50 font-semibold text-brand-blue dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Write: React.FC = () => {
  const { error: showError } = useToast();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editArticleId, setEditArticleId] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<{ draft: LocalDraft; key: string } | null>(null);
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const imageUploadInFlightRef = useRef(false);
  const operationInFlightRef = useRef(false);
  const draftSnapshotRef = useRef<{ key: string; draft: LocalDraft; shouldSave: boolean } | null>(null);
  const previousEditQueryRef = useRef<string | null | undefined>(undefined);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editQuery = searchParams.get('edit');
  const activeDraftKey = draftKeyFor(editMode ? editArticleId : null);
  const markDirty = () => {
    setIsDirty(true);
    setLastSaved(null);
  };

  draftSnapshotRef.current = {
    key: activeDraftKey,
    shouldSave: !loading && isDirty,
    draft: {
      title,
      content,
      summary,
      selectedCategoryId,
      selectedTags,
      savedAt: new Date().toISOString(),
    },
  };

  const persistLatestDraft = useCallback((showSavedTime: boolean) => {
    const snapshot = draftSnapshotRef.current;
    if (!snapshot?.shouldSave) return;
    try {
      localStorage.setItem(snapshot.key, JSON.stringify(snapshot.draft));
      if (showSavedTime) setLastSaved(new Date().toLocaleTimeString());
    } catch {
      // ignore
    }
  }, []);

  const saveDraft = useCallback(() => persistLatestDraft(true), [persistLatestDraft]);

  useEffect(() => {
    if (loading || !isDirty) return;
    const t = setTimeout(saveDraft, 2000);
    return () => clearTimeout(t);
  }, [activeDraftKey, content, isDirty, loading, saveDraft, selectedCategoryId, selectedTags, summary, title]);

  useEffect(() => {
    const flushDraft = () => persistLatestDraft(false);
    window.addEventListener('beforeunload', flushDraft);
    return () => {
      window.removeEventListener('beforeunload', flushDraft);
      flushDraft();
    };
  }, [persistLatestDraft]);

  useEffect(() => {
    let cancelled = false;
    if (previousEditQueryRef.current !== undefined && previousEditQueryRef.current !== editQuery) {
      persistLatestDraft(false);
    }
    previousEditQueryRef.current = editQuery;
    const editId = editQuery ? Number(editQuery) : null;
    if (editQuery && (!Number.isInteger(editId) || !editId || editId < 1)) {
      navigate('/write', { replace: true });
      return;
    }

    setLoading(true);
    setEditMode(editId !== null);
    setEditArticleId(editId);
    setTitle('');
    setContent('');
    setSummary('');
    setSelectedCategoryId(null);
    setSelectedTags([]);
    setLastSaved(null);
    setPendingRecovery(null);
    setIsDirty(false);
    setMobilePane('edit');

    const loadEditor = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          axios.get<Category[]>('/api/categories'),
          axios.get<Tag[]>('/api/tags'),
        ]);
        if (cancelled) return;
        setCategories(catRes.data ?? []);
        setTags(tagRes.data ?? []);

        if (editId) {
          const res = await axios.get<Article>(`/api/articles/${editId}`);
          if (cancelled) return;
          const article = res.data;
          setTitle(article.title);
          setContent(article.content);
          setSummary(article.summary || '');
          setSelectedCategoryId(article.category?.id ?? null);
          setSelectedTags(article.tags?.map((tag) => tag.id) ?? []);
        } else if ((catRes.data?.length ?? 0) > 0) {
          setSelectedCategoryId(catRes.data![0].id);
        }

        const key = draftKeyFor(editId);
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw) as LocalDraft;
            if (draft.title || draft.content) setPendingRecovery({ draft, key });
          }
        } catch {
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.error('加载写作数据失败:', err);
        showError(editId ? '加载文章失败' : '加载分类和标签失败');
        if (editId) navigate('/articles');
      } finally {
        if (!cancelled) {
          setIsDirty(false);
          setLoading(false);
        }
      }
    };

    loadEditor();
    return () => {
      cancelled = true;
    };
  }, [editQuery, persistLatestDraft]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 2500);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    if (!operationError) return;
    const t = setTimeout(() => setOperationError(null), 2500);
    return () => clearTimeout(t);
  }, [operationError]);

  useEffect(() => {
    if (!successMessage && !operationError) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSuccessMessage(null);
        setOperationError(null);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [successMessage, operationError]);

  const restoreLocalDraft = () => {
    if (!pendingRecovery) return;
    const { draft } = pendingRecovery;
    setTitle(draft.title ?? '');
    setContent(draft.content ?? '');
    setSummary(draft.summary ?? '');
    setSelectedCategoryId(draft.selectedCategoryId ?? null);
    setSelectedTags(draft.selectedTags ?? []);
    setPendingRecovery(null);
    markDirty();
  };

  const discardLocalDraft = () => {
    if (!pendingRecovery) return;
    try {
      localStorage.removeItem(pendingRecovery.key);
    } catch {
      // ignore
    }
    setPendingRecovery(null);
  };

  const handlePublish = async () => {
    if (operationInFlightRef.current) return;
    if (!title || !content) {
      setOperationError('请填写标题和内容');
      return;
    }
    setOperationError(null);

    operationInFlightRef.current = true;
    setPublishing(true);
    try {
      const articleData = {
        title,
        content,
        summary: createSummary(content),
        category: selectedCategoryId ? { id: selectedCategoryId } : null,
        tags: selectedTags.map((id) => ({ id })),
      };

      if (editMode && editArticleId) {
        await axios.put(`/api/articles/${editArticleId}?publish=true`, articleData);
        setSuccessMessage('文章已发布');
      } else {
        await axios.post('/api/articles', articleData);
        setSuccessMessage('文章已发布');
      }
      try {
        localStorage.removeItem(activeDraftKey);
      } catch {
        // ignore
      }
      setIsDirty(false);
      setTimeout(() => navigate('/articles'), 800);
    } catch (err) {
      console.error('操作失败:', err);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response: { data: { message?: string } } }).response.data.message || '操作失败')
          : '操作失败';
      showError(msg);
    } finally {
      operationInFlightRef.current = false;
      setPublishing(false);
    }
  };

  const handleDraftBox = async () => {
    if (operationInFlightRef.current) return;
    operationInFlightRef.current = true;
    saveDraft(); // 同时保存到 localStorage 作为备份
    setSavingDraft(true);
    try {
      const articleData = {
        id: editMode && editArticleId ? editArticleId : undefined,
        title: title || '未命名',
        content: content || '',
        summary: createSummary(content || ''),
        category: selectedCategoryId ? { id: selectedCategoryId } : null,
        tags: selectedTags.map((id) => ({ id })),
      };
      const res = editMode && editArticleId
        ? await axios.put<Article>(`/api/articles/${editArticleId}`, articleData)
        : await axios.post<Article>('/api/articles/draft', articleData);
      const saved = res.data;
      const previousDraftKey = activeDraftKey;
      if (saved?.id && !editMode) {
        setEditMode(true);
        setEditArticleId(saved.id);
        setSearchParams({ edit: String(saved.id) }, { replace: true });
      }
      setSuccessMessage('已保存');
      try {
        localStorage.removeItem(previousDraftKey);
      } catch {
        // ignore
      }
      setIsDirty(false);
    } catch (err) {
      console.error('保存失败:', err);
      showError('保存失败，本地内容已保留');
    } finally {
      operationInFlightRef.current = false;
      setSavingDraft(false);
    }
  };

  const handleToolbar = (before: string, after = '', placeholder = '') => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const innerText = selected || placeholder;
    const newText =
      content.substring(0, start) + before + innerText + after + content.substring(end);
    setContent(newText);
    markDirty();
    setTimeout(() => {
      el.focus();
      const innerStart = start + before.length;
      if (!selected && placeholder) {
        el.setSelectionRange(innerStart, innerStart + placeholder.length);
      } else if (!selected) {
        el.setSelectionRange(innerStart, innerStart);
      } else {
        const pos = innerStart + selected.length + after.length;
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const insertText = (text: string, selection?: { start: number; end: number }) => {
    const el = contentRef.current;
    if (!el) return;
    const start = selection?.start ?? el.selectionStart;
    const end = selection?.end ?? el.selectionEnd;
    setContent((currentContent) =>
      currentContent.substring(0, start) + text + currentContent.substring(end)
    );
    markDirty();
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleAddTag = (tagId: number) => {
    if (!selectedTags.includes(tagId)) {
      setSelectedTags([...selectedTags, tagId]);
      markDirty();
    }
  };

  const handleRemoveTag = (tagId: number) => {
    setSelectedTags(selectedTags.filter((id) => id !== tagId));
    markDirty();
  };

  const uploadImage = async (file: File, selection: { start: number; end: number }) => {
    if (!file.type.startsWith('image/')) {
      showError('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('图片大小不能超过 5MB');
      return;
    }
    if (imageUploadInFlightRef.current) {
      showError('图片正在上传，请稍候');
      return;
    }

    imageUploadInFlightRef.current = true;
    setUploading(true);
    try {
      const uploadFile = await compressImageForUpload(file);
      const formData = new FormData();
      formData.append('file', uploadFile);
      const response = await axios.post<{ data?: { url?: string }; url?: string }>(
        '/api/upload/image',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }
      );
      const imageUrl = response.data.data?.url ?? response.data.url;
      if (!imageUrl) throw new Error('No URL');
      const imageMarkdown = `![${file.name || '粘贴的图片'}](${imageUrl})`;
      insertText(imageMarkdown, selection);
    } catch (err) {
      console.error('图片上传失败:', err);
      showError('图片上传失败，请重试');
    } finally {
      imageUploadInFlightRef.current = false;
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const el = contentRef.current;
    const selection = {
      start: el?.selectionStart ?? content.length,
      end: el?.selectionEnd ?? content.length,
    };

    try {
      await uploadImage(file, selection);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const itemImage = Array.from(e.clipboardData.items)
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();
    const pastedImage = itemImage
      ?? Array.from(e.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (!pastedImage) return;

    e.preventDefault();
    void uploadImage(pastedImage, {
      start: e.currentTarget.selectionStart,
      end: e.currentTarget.selectionEnd,
    });
  };

  if (loading) {
    return (
      <div className="admin-panel flex h-96 items-center justify-center rounded-3xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900" role="status" aria-busy="true">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          <span className="text-sm text-slate-500 dark:text-slate-400">加载中…</span>
        </div>
      </div>
    );
  }

  const toolbarBtn =
    'inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white';

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[1600px] flex-col py-4 md:h-[calc(100vh-2.5rem)] md:py-5">
      <h1 className="sr-only">{editMode ? '编辑文章' : '写文章'}</h1>
      {/* 操作成功提示 - 与分类管理样式一致 */}
      {successMessage && (
        <div
          className="fixed left-1/2 right-auto top-20 z-[100] flex w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] dark:border-emerald-900 dark:bg-slate-900"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200">{successMessage}</span>
        </div>
      )}

      {/* 操作错误/校验提示 - 与分类管理样式一致 */}
      {operationError && (
        <div
          className="fixed left-1/2 right-auto top-20 z-[100] flex w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] dark:border-amber-900 dark:bg-slate-900"
          role="alert"
          aria-live="assertive"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200">{operationError}</span>
        </div>
      )}

      {pendingRecovery && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 border-l-2 border-l-amber-500 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/60 dark:border-l-amber-400 dark:bg-amber-950/30">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">发现未同步的本地草稿</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                {pendingRecovery.draft.savedAt
                  ? `保存于 ${new Date(pendingRecovery.draft.savedAt).toLocaleString()}`
                  : '可以恢复后继续编辑，也可以丢弃。'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={discardLocalDraft} className="min-h-11 rounded-xl border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40">
              丢弃
            </button>
            <button type="button" onClick={restoreLocalDraft} className="min-h-11 rounded-xl bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">
              恢复草稿
            </button>
          </div>
        </div>
      )}

      {/* 顶部：返回列表 + 标题 + 保存 + 发布 */}
      <div className="admin-surface mb-4 flex flex-col gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
        <Link
          to="/articles"
          className="admin-action admin-action-secondary shrink-0 self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          返回文章列表
        </Link>
        <input
          type="text"
          aria-label="文章标题"
          placeholder="输入文章标题…"
          className="min-w-0 flex-1 border-b border-slate-300 bg-transparent px-1 py-2 text-xl font-bold tracking-tight text-slate-950 outline-none transition-colors placeholder:text-slate-500 focus:border-brand-blue dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400 md:text-2xl"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
        />
        <div className="flex shrink-0 items-center justify-end gap-2">
          {lastSaved && (
            <span className="sr-only text-xs text-slate-500 dark:text-slate-400 sm:not-sr-only">已自动保存</span>
          )}
          <button
            type="button"
            onClick={handleDraftBox}
            disabled={savingDraft || publishing}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
          >
            {savingDraft ? <Loader2 className="inline h-4 w-4 mr-1.5 animate-spin align-middle" /> : <Save className="inline h-4 w-4 mr-1.5 align-middle" />}
            保存
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || savingDraft}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            发布
          </button>
        </div>
      </div>

      {/* 富文本工具栏 */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-2xl border border-slate-300 bg-slate-100/80 p-2.5 dark:border-slate-700 dark:bg-slate-800/80">
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('**', '**')}
          title="加粗"
          aria-label="加粗"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('*', '*')}
          title="斜体"
          aria-label="斜体"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('# ', '')}
          title="一级标题"
          aria-label="一级标题"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('> ', '')}
          title="引用"
          aria-label="引用"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('[', '](https://)', '链接文字')}
          title="链接"
          aria-label="链接"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageUpload}
        />
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="图片"
          aria-label="插入图片"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('`', '`')}
          title="行内代码"
          aria-label="行内代码"
        >
          <Braces className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('\n```\n', '\n```\n')}
          title="代码块"
          aria-label="代码块"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('\n- ', '')}
          title="无序列表"
          aria-label="无序列表"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => handleToolbar('\n1. ', '')}
          title="有序列表"
          aria-label="有序列表"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onClick={() =>
            handleToolbar(
              '\n| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n',
              ''
            )
          }
          title="表格"
          aria-label="表格"
        >
          <Table className="h-4 w-4" />
        </button>
      </div>

      {/* 分类和标签 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-b-2xl border-x border-b border-slate-300 bg-white px-4 py-3 md:rounded-none dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <label htmlFor="write-category" className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">分类</label>
          <EditorSelect
            id="write-category"
            ariaLabel="文章分类"
            value={selectedCategoryId}
            placeholder="选择分类"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            disabled={categories.length === 0}
            onSelect={(categoryId) => {
              setSelectedCategoryId(categoryId);
              markDirty();
            }}
          />
        </div>
        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" aria-hidden />
        <div className="flex min-w-0 basis-full flex-wrap items-center gap-2 sm:basis-auto">
          <label htmlFor="write-tag" className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">标签</label>
          {selectedTags.map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            return tag ? (
              <span
                key={tag.id}
                className="inline-flex h-11 max-w-full items-center rounded-xl border border-blue-200 bg-blue-50 pl-3 text-sm font-semibold text-brand-blue dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300"
              >
                <span className="truncate">{tag.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="inline-flex h-11 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                  aria-label={`移除标签 ${tag.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null;
          })}
          <EditorSelect
            id="write-tag"
            ariaLabel="添加标签"
            value={null}
            placeholder={selectedTags.length === tags.length && tags.length > 0 ? '标签已全部添加' : '添加标签'}
            options={tags
              .filter((tag) => !selectedTags.includes(tag.id))
              .map((tag) => ({ value: tag.id, label: tag.name }))}
            disabled={tags.length === 0 || selectedTags.length === tags.length}
            onSelect={handleAddTag}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 md:hidden dark:border-slate-700 dark:bg-slate-800" aria-label="写作视图">
        <button
          type="button"
          onClick={() => setMobilePane('edit')}
          className={`inline-flex min-h-11 items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ${mobilePane === 'edit' ? 'border-brand-blue bg-white text-slate-950 dark:bg-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
          aria-pressed={mobilePane === 'edit'}
        >
          <PencilLine className="h-4 w-4" aria-hidden /> 编辑
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('preview')}
          className={`inline-flex min-h-11 items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue ${mobilePane === 'preview' ? 'border-brand-blue bg-white text-slate-950 dark:bg-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
          aria-pressed={mobilePane === 'preview'}
        >
          <Eye className="h-4 w-4" aria-hidden /> 预览
        </button>
      </div>

      {/* 左右分栏：编辑区 + 实时预览 */}
      <div className="flex min-h-[28rem] flex-1 overflow-hidden rounded-b-2xl border border-slate-300 md:min-h-0 md:flex-row md:border-t-0 dark:border-slate-700">
        <div className={`${mobilePane === 'edit' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col bg-white md:flex md:w-1/2 md:flex-none dark:bg-slate-900`}>
          <textarea
            ref={contentRef}
            aria-label="文章正文"
            placeholder="输入正文（支持 Markdown 富文本）…"
            className="w-full flex-1 resize-none rounded-b-2xl bg-white p-5 font-mono text-[14px] leading-7 text-slate-900 outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue md:rounded-bl-2xl md:rounded-br-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              markDirty();
            }}
            onPaste={handlePaste}
          />
        </div>
        <div className={`${mobilePane === 'preview' ? 'block' : 'hidden'} prose prose-slate min-w-0 max-w-none flex-1 overflow-y-auto bg-[#fbfcfe] p-5 text-[15px] md:block md:w-1/2 md:flex-none md:border-l md:border-slate-300 md:p-6 md:dark:border-slate-700 dark:bg-slate-950 dark:prose-invert`} aria-label="文章预览">
          {content && <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
};

export default Write;
