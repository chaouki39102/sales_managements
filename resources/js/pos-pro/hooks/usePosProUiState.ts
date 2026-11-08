// ════════════════════════════════════════════════════════════════════════════
// pos-pro/hooks/usePosProUiState.ts
//
// Open/closed state of every POSProPage drawer and modal, "any modal open"
// for the keyboard shortcuts, close-the-top-modal (Escape), and fullscreen.
// ════════════════════════════════════════════════════════════════════════════
import { useState, useRef, useCallback } from 'react';
import type { PosProPinRequest } from './usePosProDiscounts';

export function usePosProUiState() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSessionInvoices, setShowSessionInvoices] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinModal, setPinModal] = useState<PosProPinRequest>(null);

  // ── اختصارات لوحة المفاتيح: هل يوجد مودال مفتوح + إغلاق المودال العلوي ────
  const anyModalOpen = drawerOpen || customerModalOpen || paymentOpen || receiptOpen ||
    sessionOpen || heldOpen || returnsOpen || helpOpen || showSettings ||
    showSessionInvoices || showScanner || manualOpen || !!pinModal;
  const closeTopModal = useCallback(() => {
    if (paymentOpen)           setPaymentOpen(false);
    else if (receiptOpen)      setReceiptOpen(false);
    else if (sessionOpen)      setSessionOpen(false);
    else if (heldOpen)         setHeldOpen(false);
    else if (returnsOpen)      setReturnsOpen(false);
    else if (helpOpen)         setHelpOpen(false);
    else if (manualOpen)       setManualOpen(false);
    else if (customerModalOpen) setCustomerModalOpen(false);
    else if (drawerOpen)       setDrawerOpen(false);
    else if (showScanner)      setShowScanner(false);
    else if (showSettings)     setShowSettings(false);
    else if (showSessionInvoices) setShowSessionInvoices(false);
    else if (pinModal)         setPinModal(null);
  }, [drawerOpen, customerModalOpen, paymentOpen, receiptOpen, sessionOpen, heldOpen,
    returnsOpen, helpOpen, showSettings, showSessionInvoices, showScanner, manualOpen, pinModal]);

  // ── ملء الشاشة (native API + CSS fallback) ───────────────────────────────
  const toggleFullscreen = useCallback(() => {
    setFullscreen(prev => {
      if (!prev) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
        return true;
      }
      document.exitFullscreen?.().catch(() => {});
      return false;
    });
  }, []);

  return {
    drawerOpen, setDrawerOpen,
    customerModalOpen, setCustomerModalOpen,
    paymentOpen, setPaymentOpen,
    receiptOpen, setReceiptOpen,
    sessionOpen, setSessionOpen,
    heldOpen, setHeldOpen,
    returnsOpen, setReturnsOpen,
    helpOpen, setHelpOpen,
    showSettings, setShowSettings,
    showSessionInvoices, setShowSessionInvoices,
    showScanner, setShowScanner,
    manualOpen, setManualOpen,
    fullscreen, containerRef, toggleFullscreen,
    pinModal, setPinModal,
    anyModalOpen, closeTopModal,
  };
}

export type PosProUi = ReturnType<typeof usePosProUiState>;
