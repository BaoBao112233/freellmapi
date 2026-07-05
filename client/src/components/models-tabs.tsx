import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n'

// Segmented Chat | Embeddings | Fusion switcher shared by the Models pages.
// Industry-standard layout: one "Models" section, modality as a tab — chat
// routing (cross-model fallback), embeddings routing (same-model,
// cross-provider fallback), and fusion (multi-model synthesis) are different
// machines behind one roof.
export function ModelsTabs() {
  const { t } = useI18n()
  const tab = (isActive: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs rounded-lg transition-colors ${
      isActive ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`
  return (
    // On narrow screens the modalities can't all fit, so the bar scrolls
    // horizontally and bleeds to the viewport edges (scrollbar hidden) instead
    // of clipping "Fusion". On sm+ it's just a hugging pill as before.
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-xl border p-1">
      <NavLink to="/models/chat" className={({ isActive }) => tab(isActive)}>{t('models.chatModelsTab')}</NavLink>
      <NavLink to="/models/embeddings" className={({ isActive }) => tab(isActive)}>{t('models.embeddingsTab')}</NavLink>
      <NavLink to="/models/image" className={({ isActive }) => tab(isActive)}>{t('models.imageTab')}</NavLink>
      <NavLink to="/models/audio" className={({ isActive }) => tab(isActive)}>{t('models.audioTab')}</NavLink>
      <NavLink to="/models/video" className={({ isActive }) => tab(isActive)}>{t('models.videoTab')}</NavLink>
      <NavLink to="/models/fusion" className={({ isActive }) => tab(isActive)}>
        {({ isActive }) => (
          <>
            {t('models.fusionTab')}
            <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide ${
              isActive ? 'bg-background/20 text-background' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              {t('models.newBadge')}
            </span>
          </>
        )}
      </NavLink>
      </div>
    </div>
  )
}
