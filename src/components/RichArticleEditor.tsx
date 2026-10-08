import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  Video,
  Share2,
  Minus,
  Sparkles,
  Eye,
  Save,
  Send,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Article,
  ArticleStatus,
  Author,
  Category,
  MediaItem,
} from '../types/editorial';
import { EditorialImage } from './EditorialImage';
import { auth, saveArticleToFirestore } from '../firebase';

interface RichArticleEditorProps {
  initialArticle?: Article | null;
  categories: Category[];
  authors: Author[];
  media: MediaItem[];
  authToken: string;
  onSaveSuccess: (article: Article) => void;
  onCancel: () => void;
  onPreviewArticle: (article: Article) => void;
}

export const RichArticleEditor: React.FC<RichArticleEditorProps> = ({
  initialArticle,
  categories,
  authors,
  media,
  authToken,
  onSaveSuccess,
  onCancel,
  onPreviewArticle,
}) => {
  const [title, setTitle] = useState(initialArticle?.title || '');
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle || '');
  const [slug, setSlug] = useState(initialArticle?.slug || '');
  const [category, setCategory] = useState(
    initialArticle?.category || categories[0]?.slug || 'world'
  );
  const [tagsInput, setTagsInput] = useState(
    initialArticle?.tags?.join(', ') || 'Global Affairs, Analysis'
  );
  const [authorId, setAuthorId] = useState(
    initialArticle?.authorId || authors[0]?.id || 'author-elena-rostova'
  );
  const [featuredImage, setFeaturedImage] = useState(
    initialArticle?.featuredImage || media[0]?.url || ''
  );
  const [imageCaption, setImageCaption] = useState(initialArticle?.imageCaption || '');
  const [body, setBody] = useState(
    initialArticle?.body ||
      '<p>Enter your dispatch body here. Use the editorial formatting toolbar above to insert headings, pull quotes, inline photographs with captions, data tables, or embedded media.</p>'
  );
  const [status, setStatus] = useState<ArticleStatus>(initialArticle?.status || 'draft');
  const [publishedAt, setPublishedAt] = useState(
    initialArticle?.publishedAt
      ? initialArticle.publishedAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [scheduledFor, setScheduledFor] = useState(
    initialArticle?.scheduledFor ? initialArticle.scheduledFor.slice(0, 16) : ''
  );
  const [readingTime, setReadingTime] = useState(initialArticle?.readingTime || 5);
  const [isLead, setIsLead] = useState(Boolean(initialArticle?.isLead));
  const [isTrending, setIsTrending] = useState(Boolean(initialArticle?.isTrending));
  const [isDeveloping, setIsDeveloping] = useState(Boolean(initialArticle?.isDeveloping));
  const [developingUpdates, setDevelopingUpdates] = useState<
    { id: string; timestamp: string; summary: string }[]
  >(initialArticle?.developingUpdates || []);

  // SEO & Open Graph state
  const [seoTitle, setSeoTitle] = useState(initialArticle?.seo?.title || '');
  const [seoDescription, setSeoDescription] = useState(initialArticle?.seo?.description || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialArticle?.seo?.canonicalUrl || '');
  const [ogTitle, setOgTitle] = useState(initialArticle?.seo?.ogTitle || '');
  const [ogDescription, setOgDescription] = useState(initialArticle?.seo?.ogDescription || '');
  const [ogImage, setOgImage] = useState(initialArticle?.seo?.ogImage || '');

  // Media Picker Modal
  const [mediaModalMode, setMediaModalMode] = useState<'none' | 'featured' | 'inline'>('none');

  // AI Editorial Co-Pilot (gemini-3.1-flash-lite)
  const [aiTopicPrompt, setAiTopicPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    headlines?: string[];
    socialCaptions?: { x: string; linkedin: string };
    latencyMs?: number;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const appendHtmlBlock = (snippet: string) => {
    setBody((prev) => `${prev}\n${snippet}`);
  };

  const handleAiEditorialAssist = async (task: string) => {
    setAiLoading(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/ai/editorial-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          task,
          topic: aiTopicPrompt || title,
          title,
          body,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Assistant error');

      if (task === 'Generate Full Draft') {
        setTitle(data.suggestedTitle || title);
        setSubtitle(data.suggestedSubtitle || subtitle);
        setBody(data.suggestedBody || body);
        if (Array.isArray(data.suggestedTags)) {
          setTagsInput(data.suggestedTags.join(', '));
        }
        // MANDATORY RULE (Section 42): AI-generated content MUST remain a draft until admin reviews and publishes
        setStatus('draft');
        setSaveMessage(
          'AI Draft generated via gemini-3.1-flash-lite and set to DRAFT status for mandatory human editorial review.'
        );
      }
      if (data.seoTitle) setSeoTitle(data.seoTitle);
      if (data.seoDescription) setSeoDescription(data.seoDescription);
      if (data.suggestedTitle && !ogTitle) setOgTitle(data.suggestedTitle);
      if (data.seoDescription && !ogDescription) setOgDescription(data.seoDescription);

      setAiSuggestions({
        headlines: data.headlines,
        socialCaptions: data.socialCaptions,
        latencyMs: data.latencyMs,
      });
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'AI assist failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const buildArticlePayload = (overrideStatus?: ArticleStatus): Article => {
    const selectedCategory = categories.find((c) => c.slug === category) || categories[0];
    const selectedAuthor = authors.find((a) => a.id === authorId) || authors[0];
    const computedSlug =
      slug.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      `dispatch-${Date.now()}`;

    const finalStatus = overrideStatus || status;

    return {
      id: initialArticle?.id || `art-${Date.now()}`,
      title: title.trim() || 'Untitled Editorial Dispatch',
      subtitle: subtitle.trim(),
      slug: computedSlug,
      category: selectedCategory.slug,
      categoryName: selectedCategory.name,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      authorId: selectedAuthor.id,
      authorName: selectedAuthor.name,
      authorRole: selectedAuthor.role,
      featuredImage,
      imageCaption,
      body,
      status: finalStatus,
      publishedAt: new Date(publishedAt || Date.now()).toISOString(),
      updatedAt: new Date().toISOString(),
      scheduledFor:
        finalStatus === 'scheduled' && scheduledFor
          ? new Date(scheduledFor).toISOString()
          : undefined,
      readingTime: Number(readingTime) || 5,
      views: initialArticle?.views || 0,
      isLead,
      isTrending,
      isDeveloping,
      developingUpdates,
      isDemo: Boolean(initialArticle?.isDemo),
      seo: {
        title: seoTitle || `${title} | WORLDPULSE`,
        description: seoDescription || subtitle,
        canonicalUrl: canonicalUrl || `/${selectedCategory.slug}/${computedSlug}`,
        ogTitle: ogTitle || title,
        ogDescription: ogDescription || subtitle,
        ogImage: ogImage || featuredImage,
      },
    };
  };

  const handleSave = async (targetStatus: ArticleStatus) => {
    if (!title.trim()) {
      setSaveMessage('Please enter a headline before saving.');
      return;
    }
    setSaving(true);
    setSaveMessage('');
    try {
      const payload = buildArticlePayload(targetStatus);
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save article.');
      if (auth.currentUser) {
        await saveArticleToFirestore(data.article, Boolean(initialArticle));
      }
      setStatus(targetStatus);
      onSaveSuccess(data.article);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="bg-white border border-[#E7E5E2] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
            WORLDPULSE EDITORIAL COMPOSER
          </span>
          <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
            {initialArticle ? 'Edit Article Dispatch' : 'Create New Article'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold border border-[#E7E5E2] text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onPreviewArticle(buildArticlePayload())}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#171717] text-[#171717] hover:bg-[#F7F5F2] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('draft')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#171717] text-white hover:bg-[#333333] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('scheduled')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-[#6E1723] text-[#6E1723] hover:bg-[#F7F5F2] cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('published')}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Now</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-4 bg-white border-l-4 border-[#6E1723] text-sm text-[#171717]">
          {saveMessage}
        </div>
      )}

      {/* AI Editorial Co-Pilot Panel (Sections 42 & 43 — Human Review Gate Enforced) */}
      <div className="bg-white border border-[#E7E5E2] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6E1723]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#6E1723] font-sans">
              AI Editorial Assistant (gemini-3.1-flash-lite)
            </h3>
          </div>
          <span className="text-xs text-[#6B6B6B]">
            Workflow: AI Draft → Mandatory Human Editor Review → Fact-Check → Publish
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={aiTopicPrompt}
            onChange={(e) => setAiTopicPrompt(e.target.value)}
            placeholder="Enter source notes, press release summary, or global topic to analyze..."
            className="flex-1 px-3.5 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
          />
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => handleAiEditorialAssist('Generate Full Draft')}
            className="px-4 py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {aiLoading ? 'Generating...' : 'Generate Draft for Review'}
          </button>
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => handleAiEditorialAssist('Suggest Headlines & SEO')}
            className="px-4 py-2 text-xs font-semibold border border-[#171717] text-[#171717] hover:bg-[#F7F5F2] whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            Generate Headlines & SEO
          </button>
        </div>

        {aiSuggestions && (
          <div className="pt-3 border-t border-[#E7E5E2] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {aiSuggestions.headlines && aiSuggestions.headlines.length > 0 && (
              <div>
                <p className="font-bold uppercase tracking-wider text-[#171717] mb-1.5">
                  Headline Alternatives (Click to Apply):
                </p>
                <div className="space-y-1.5">
                  {aiSuggestions.headlines.map((hl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTitle(hl)}
                      className="block w-full text-left p-2 bg-[#F7F5F2] hover:bg-[#E7E5E2] text-[#171717] transition-colors cursor-pointer"
                    >
                      {hl}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {aiSuggestions.socialCaptions && (
              <div className="space-y-2">
                <p className="font-bold uppercase tracking-wider text-[#171717]">
                  Generated Social Distribution Copy:
                </p>
                <div className="p-2 bg-[#F7F5F2] border border-[#E7E5E2]">
                  <strong className="text-[#6E1723]">X / Twitter:</strong>{' '}
                  {aiSuggestions.socialCaptions.x}
                </div>
                <div className="p-2 bg-[#F7F5F2] border border-[#E7E5E2]">
                  <strong className="text-[#6E1723]">LinkedIn:</strong>{' '}
                  {aiSuggestions.socialCaptions.linkedin}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Columns: Core Content & Rich Text Editor */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1">
                Article Headline *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '')
                    );
                  }
                }}
                placeholder="Enter a commanding editorial headline..."
                className="w-full px-3.5 py-2.5 text-lg font-editorial font-semibold bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1">
                Subtitle / Deck
              </label>
              <textarea
                rows={2}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Concise summary deck explaining the core news value..."
                className="w-full px-3.5 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="example-story-slug"
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Diplomacy, Global Trade, Semiconductors"
                  className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
            </div>
          </div>

          {/* Rich Text Formatting Toolbar & Body Composer (Section 11) */}
          <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#171717]">
                Article Body (Rich HTML & Editorial Blocks)
              </label>
              <span className="text-xs text-[#6B6B6B]">
                Supports headings, lists, pull-quotes, tables, inline figures & embeds
              </span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#F7F5F2] border border-[#E7E5E2]">
              <button
                type="button"
                onClick={() => appendHtmlBlock('<h1>Section Headline (H1)</h1>')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Insert H1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => appendHtmlBlock('<h2>Subheading Title (H2)</h2>')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Insert H2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => appendHtmlBlock('<h3>Subsection Heading (H3)</h3>')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Insert H3"
              >
                <Heading3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => appendHtmlBlock('<p><strong>Bold statement</strong></p>')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => appendHtmlBlock('<p><em>Italic emphasis</em></p>')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => appendHtmlBlock('<p><u>Underlined text</u></p>')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock('<ul>\n  <li>First key point</li>\n  <li>Second key point</li>\n</ul>')
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock('<ol>\n  <li>First step</li>\n  <li>Second step</li>\n</ol>')
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock(
                    '<blockquote>“Insert a compelling editorial pull-quote that highlights a primary source.”</blockquote>'
                  )
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock('<p><a href="https://example.org">Referenced institutional report</a></p>')
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMediaModalMode('inline')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#E7E5E2] hover:border-[#6E1723] text-[#6E1723] cursor-pointer"
                title="Insert Inline Image with Caption"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Insert Image</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock(
                    `<table>
  <thead>
    <tr><th>Region / Metric</th><th>Baseline</th><th>Current Projection</th></tr>
  </thead>
  <tbody>
    <tr><td>European Corridor</td><td>14.2%</td><td>19.8%</td></tr>
    <tr><td>Asia-Pacific Hub</td><td>21.0%</td><td>27.4%</td></tr>
  </tbody>
</table>`
                  )
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Insert Data Table"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock(
                    `<figure class="my-6 p-4 bg-[#F7F5F2] border border-[#E7E5E2]">
  <p class="text-xs font-bold uppercase tracking-wider text-[#6E1723]">Embedded Video Briefing</p>
  <p class="text-sm mt-1">WORLDPULSE Video Dispatch Stream · 1080p HD Broadcast Embed</p>
</figure>`
                  )
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Embed Video Block"
              >
                <Video className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  appendHtmlBlock(
                    `<aside class="my-6 p-4 bg-[#F7F5F2] border-l-4 border-[#171717]">
  <p class="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">Official Statement / Social Post Embed</p>
  <p class="text-sm mt-1">“Full communique text released by the secretariat at 09:00 UTC.”</p>
</aside>`
                  )
                }
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Embed Social Post"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => appendHtmlBlock('<hr />')}
                className="p-2 text-xs hover:bg-white border border-transparent hover:border-[#E7E5E2] cursor-pointer"
                title="Horizontal Separator"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-4 text-sm font-mono bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723] leading-relaxed"
            />
          </div>

          {/* Developing Story Live Updates Editor (Section 18) */}
          <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDeveloping}
                  onChange={(e) => setIsDeveloping(e.target.checked)}
                  className="accent-[#6E1723] w-4 h-4"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#6E1723]">
                  Mark as Developing Story (Live Updates Timeline)
                </span>
              </label>

              {isDeveloping && (
                <button
                  type="button"
                  onClick={() =>
                    setDevelopingUpdates((prev) => [
                      {
                        id: `upd-${Date.now()}`,
                        timestamp: `${new Date().toISOString().slice(11, 16)} UTC`,
                        summary: 'New developing update...',
                      },
                      ...prev,
                    ])
                  }
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#6E1723] text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Live Update</span>
                </button>
              )}
            </div>

            {isDeveloping && (
              <div className="space-y-2.5 pt-2">
                {developingUpdates.map((upd, idx) => (
                  <div key={upd.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={upd.timestamp}
                      onChange={(e) => {
                        const next = [...developingUpdates];
                        next[idx].timestamp = e.target.value;
                        setDevelopingUpdates(next);
                      }}
                      className="w-28 px-2.5 py-1.5 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                      placeholder="10:30 UTC"
                    />
                    <input
                      type="text"
                      value={upd.summary}
                      onChange={(e) => {
                        const next = [...developingUpdates];
                        next[idx].summary = e.target.value;
                        setDevelopingUpdates(next);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      placeholder="Enter timestamped developing update..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDevelopingUpdates(developingUpdates.filter((_, i) => i !== idx))
                      }
                      className="p-1.5 text-[#6B6B6B] hover:text-[#8C2634] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEO & Open Graph Metadata Configuration (Section 12 & 21) */}
          <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans border-b border-[#E7E5E2] pb-2">
              SEO, Canonical & OpenGraph Social Cards
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  SEO Title (30–60 chars)
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={`${title || 'Article Headline'} | WORLDPULSE`}
                  className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Canonical URL
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder={`/${category}/${slug || 'story-slug'}`}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                SEO Meta Description (120–160 chars)
              </label>
              <textarea
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder={subtitle || 'Enter search engine snippet summary...'}
                className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Open Graph Title
                </label>
                <input
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  placeholder={title}
                  className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Open Graph Image URL
                </label>
                <input
                  type="text"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder={featuredImage}
                  className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Classification, Author, Featured Image, & Publishing Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E7E5E2] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans border-b border-[#E7E5E2] pb-2">
              Classification & Attribution
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">Category Desk</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Assigned Correspondent / Author
              </label>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
              >
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                  className="w-full px-3 py-2 text-xs font-semibold uppercase bg-[#F7F5F2] border border-[#E7E5E2]"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Reading Time (Min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={readingTime}
                  onChange={(e) => setReadingTime(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Publication Date/Time
              </label>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
              />
            </div>

            {status === 'scheduled' && (
              <div>
                <label className="block text-xs font-semibold text-[#6E1723] mb-1">
                  Scheduled Auto-Publish Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#6E1723]"
                />
              </div>
            )}

            <div className="pt-2 border-t border-[#E7E5E2] space-y-2.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLead}
                  onChange={(e) => setIsLead(e.target.checked)}
                  className="accent-[#6E1723]"
                />
                <span className="font-semibold text-[#171717]">
                  Feature as Homepage Lead Story
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                  className="accent-[#6E1723]"
                />
                <span className="font-semibold text-[#171717]">
                  Mark as Trending Globally
                </span>
              </label>
            </div>
          </div>

          {/* Featured Image Selector */}
          <div className="bg-white border border-[#E7E5E2] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                Featured Photograph
              </h3>
              <button
                type="button"
                onClick={() => setMediaModalMode('featured')}
                className="text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer"
              >
                Choose from Media Library
              </button>
            </div>

            <EditorialImage
              src={featuredImage}
              alt={title || 'Featured Image Preview'}
              categoryName={category}
              aspectClass="aspect-[16/9]"
            />

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Image URL or Path
              </label>
              <input
                type="text"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Photo Caption & Credit
              </label>
              <textarea
                rows={2}
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Fig. 1 — Caption describing the photograph and attribution..."
                className="w-full px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Selection Modal */}
      {mediaModalMode !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E7E5E2] max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-3">
              <h3 className="font-editorial text-xl font-semibold text-[#171717]">
                Select Image from WORLDPULSE Media Library
              </h3>
              <button
                type="button"
                onClick={() => setMediaModalMode('none')}
                className="text-xs font-semibold text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#E7E5E2] p-3 flex flex-col justify-between gap-3"
                >
                  <div>
                    <EditorialImage
                      src={item.url}
                      alt={item.altText}
                      aspectClass="aspect-[16/9]"
                    />
                    <p className="text-xs font-semibold text-[#171717] mt-2">{item.title}</p>
                    <p className="text-[11px] text-[#6B6B6B]">{item.caption}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaModalMode === 'featured') {
                        setFeaturedImage(item.url);
                        if (!imageCaption) setImageCaption(item.caption);
                      } else {
                        appendHtmlBlock(
                          `<figure>\n  <img src="${item.url}" alt="${item.altText}" loading="lazy" />\n  <figcaption>${item.caption}</figcaption>\n</figure>`
                        );
                      }
                      setMediaModalMode('none');
                    }}
                    className="w-full py-1.5 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                  >
                    {mediaModalMode === 'featured' ? 'Set as Featured Image' : 'Insert into Article Body'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
