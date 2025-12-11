/**
 * UI Handlers - Handle SDK UI-related messages
 * Provides toast notifications, confirmation dialogs, and modals
 */

import { toast } from 'sonner';

export interface ToastPayload {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  description?: string;
}

export interface ConfirmPayload {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
}

export interface ModalPayload {
  id?: string;
  title: string;
  content?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
}

export interface ModalResult {
  opened: boolean;
  modalId: string;
}

// Active modals registry
const activeModals = new Map<string, { appId: string; resolve?: (value: unknown) => void }>();

// Pending confirmation resolvers
let pendingConfirmResolve: ((result: ConfirmResult) => void) | null = null;

/**
 * Handler for ui:showToast
 * Shows a toast notification
 */
export async function handleShowToast(
  _appId: string,
  payload: unknown
): Promise<{ shown: boolean }> {
  const { message, type = 'info', duration = 4000, description } = payload as ToastPayload;

  if (!message || typeof message !== 'string') {
    throw new Error('Invalid toast: message is required');
  }

  // Show toast using sonner
  const options = {
    duration,
    description,
  };

  switch (type) {
    case 'success':
      toast.success(message, options);
      break;
    case 'error':
      toast.error(message, options);
      break;
    case 'warning':
      toast.warning(message, options);
      break;
    case 'info':
    default:
      toast.info(message, options);
      break;
  }

  return { shown: true };
}

/**
 * Handler for ui:showConfirm
 * Shows a confirmation dialog and waits for user response
 */
export async function handleShowConfirm(
  appId: string,
  payload: unknown
): Promise<ConfirmResult> {
  const {
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
  } = payload as ConfirmPayload;

  if (!title || !message) {
    throw new Error('Invalid confirm dialog: title and message are required');
  }

  // Dispatch custom event to show confirmation dialog
  const event = new CustomEvent('sdk:confirm:request', {
    detail: {
      appId,
      title,
      message,
      confirmText,
      cancelText,
    },
  });
  window.dispatchEvent(event);

  // Return a promise that will be resolved when user confirms/cancels
  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;

    // Set a timeout (2 minutes)
    setTimeout(() => {
      if (pendingConfirmResolve === resolve) {
        pendingConfirmResolve = null;
        resolve({ confirmed: false });
      }
    }, 2 * 60 * 1000);
  });
}

/**
 * Called by the UI when user responds to confirmation dialog
 */
export function resolveConfirmDialog(confirmed: boolean): void {
  if (pendingConfirmResolve) {
    pendingConfirmResolve({ confirmed });
    pendingConfirmResolve = null;
  }
}

/**
 * Handler for ui:showModal
 * Opens a modal window
 */
export async function handleShowModal(
  appId: string,
  payload: unknown
): Promise<ModalResult> {
  const {
    id,
    title,
    content,
    size = 'md',
    closable = true,
  } = payload as ModalPayload;

  if (!title) {
    throw new Error('Invalid modal: title is required');
  }

  // Generate modal ID if not provided
  const modalId = id || `modal_${appId}_${Date.now()}`;

  // Check if modal is already open
  if (activeModals.has(modalId)) {
    throw new Error(`Modal already open: ${modalId}`);
  }

  // Register modal
  activeModals.set(modalId, { appId });

  // Dispatch custom event to open modal
  const event = new CustomEvent('sdk:modal:open', {
    detail: {
      appId,
      modalId,
      title,
      content,
      size,
      closable,
    },
  });
  window.dispatchEvent(event);

  return { opened: true, modalId };
}

/**
 * Handler for ui:closeModal
 * Closes a modal window
 */
export async function handleCloseModal(
  appId: string,
  payload: unknown
): Promise<{ closed: boolean }> {
  const { modalId } = payload as { modalId?: string };

  if (!modalId) {
    // Close all modals for this app
    const toClose: string[] = [];
    activeModals.forEach((data, id) => {
      if (data.appId === appId) {
        toClose.push(id);
      }
    });

    toClose.forEach(id => {
      activeModals.delete(id);
      window.dispatchEvent(new CustomEvent('sdk:modal:close', { detail: { modalId: id } }));
    });

    return { closed: toClose.length > 0 };
  }

  // Close specific modal
  const modal = activeModals.get(modalId);
  if (!modal || modal.appId !== appId) {
    return { closed: false };
  }

  activeModals.delete(modalId);
  window.dispatchEvent(new CustomEvent('sdk:modal:close', { detail: { modalId } }));

  return { closed: true };
}

/**
 * Called when a modal is closed (from UI)
 */
export function onModalClosed(modalId: string): void {
  activeModals.delete(modalId);
}

/**
 * Get active modals for an app
 */
export function getActiveModals(appId: string): string[] {
  const modals: string[] = [];
  activeModals.forEach((data, id) => {
    if (data.appId === appId) {
      modals.push(id);
    }
  });
  return modals;
}

/**
 * Close all modals for an app (cleanup on unmount)
 */
export function closeAllModalsForApp(appId: string): void {
  const toClose: string[] = [];
  activeModals.forEach((data, id) => {
    if (data.appId === appId) {
      toClose.push(id);
    }
  });

  toClose.forEach(id => {
    activeModals.delete(id);
    window.dispatchEvent(new CustomEvent('sdk:modal:close', { detail: { modalId: id } }));
  });
}
