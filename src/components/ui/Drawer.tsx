import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 bg-forest/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.aside role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-canvas p-6 shadow-[0_24px_70px_rgba(22,52,47,.22)]" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="display text-3xl text-forest">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close drawer" className="grid size-9 place-items-center rounded-xl bg-white text-forest hover:text-nuraa"><X size={18} /></button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
