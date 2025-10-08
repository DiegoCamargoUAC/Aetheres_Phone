import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface IncomingToastProps {
  visible: boolean;
  caller: string;
  onAccept: () => void;
  onReject: () => void;
}

const toastVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const IncomingToast: React.FC<IncomingToastProps> = ({ visible, caller, onAccept, onReject }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="toast"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={toastVariants}
        transition={{ duration: 0.2 }}
      >
        <div>
          <strong>Llamada entrante</strong>
          <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>De: {caller || 'Desconocido'}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAccept}
            style={{
              backgroundColor: '#16a34a',
              border: 'none',
              color: '#fff',
            }}
          >
            Aceptar
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReject}
            style={{
              backgroundColor: '#dc2626',
              border: 'none',
              color: '#fff',
            }}
          >
            Rechazar
          </motion.button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default IncomingToast;
