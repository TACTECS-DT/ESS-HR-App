/**
 * ErrorModalContext — global error modal provider.
 *
 * Wrap the app root with <ErrorModalProvider>.
 * Call useErrorModal().showModal(...) from anywhere (hooks, screens, etc.)
 * to display the Odoo-style error modal.
 */
import React, {createContext, useCallback, useContext, useState} from 'react';
import ErrorModal from '../components/common/ErrorModal';

interface ErrorModalOptions {
  title?: string;
  message: string;
  code?: string;
  httpStatus?: number;
}

interface ErrorModalContextValue {
  showModal: (opts: ErrorModalOptions) => void;
}

const ErrorModalContext = createContext<ErrorModalContextValue>({
  showModal: () => {},
});

export function ErrorModalProvider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<ErrorModalOptions & {visible: boolean}>({
    visible: false,
    message: '',
  });

  const showModal = useCallback((opts: ErrorModalOptions) => {
    setState({...opts, visible: true});
  }, []);

  const handleClose = useCallback(() => {
    setState(s => ({...s, visible: false}));
  }, []);

  return (
    <ErrorModalContext.Provider value={{showModal}}>
      {children}
      <ErrorModal
        visible={state.visible}
        title={state.title}
        message={state.message}
        code={state.code}
        httpStatus={state.httpStatus}
        onClose={handleClose}
      />
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  return useContext(ErrorModalContext);
}
