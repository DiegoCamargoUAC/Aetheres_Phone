import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

const variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const Toast: React.FC<ToastProps> = ({ message, actionLabel, onAction, onClose }) => (
  <AnimatePresence>
    {message ? (
      <motion.div
        key={message}
        className="toast"
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2 }}
      >
        <span>{message}</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {actionLabel && onAction && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAction}
            >
              {actionLabel}
            </motion.button>
          )}
          {onClose && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
            >
              Cerrar
            </motion.button>
          )}
        </div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default Toast;
