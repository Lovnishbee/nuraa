import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-forest/35 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_70px_rgba(22,52,47,.22)]" initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="display text-3xl text-forest">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close modal" className="grid size-9 place-items-center rounded-xl bg-sage text-forest hover:text-nuraa"><X size={18} /></button>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
