import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
}) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    return (
        <Transition show={show}>
            <Dialog
                as="div"
                id="modal"
                className="relative z-[100]"
                onClose={close}
            >
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-gray-500/75 transition-opacity data-[closed]:opacity-0 ease-out duration-300 data-[enter]:duration-300 data-[leave]:duration-200"
                />

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <DialogPanel
                            transition
                            className={`relative transform overflow-hidden rounded-lg bg-white text-right shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95 sm:my-8 sm:w-full ${maxWidthClass}`}
                        >
                            {children}
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
