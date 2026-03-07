import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface DialogProps {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
}

const overlay = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
}
const panel = {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
    exit: { opacity: 0, scale: 0.95, y: 16, transition: { duration: 0.18 } },
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
    // Close on Escape
    const panelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={overlay}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        variants={panel}
                        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-border px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold">{title}</h2>
                                {description && (
                                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="ml-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
