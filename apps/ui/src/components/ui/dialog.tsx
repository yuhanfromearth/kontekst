import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useContext, useState } from 'react';

import { springPopup, tweenFast } from '#/lib/motion';
import { cn } from '#/lib/utils';

const DialogOpenContext = createContext<boolean>(false);

function Dialog({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: DialogPrimitive.Root.Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    defaultOpen ?? false
  );
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  return (
    <DialogOpenContext.Provider value={open}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={openProp}
        defaultOpen={defaultOpen}
        onOpenChange={(next, eventDetails) => {
          if (!isControlled) setUncontrolledOpen(next);
          onOpenChange?.(next, eventDetails);
        }}
        {...props}
      />
    </DialogOpenContext.Provider>
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  const open = useContext(DialogOpenContext);

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal keepMounted>
          <DialogPrimitive.Backdrop
            render={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={tweenFast}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              />
            }
          />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            render={
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: '-46%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, y: '-48%' }}
                transition={springPopup}
              />
            }
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-140 -translate-x-1/2 rounded-2xl bg-card text-card-foreground p-5 shadow-2xl ring-1 ring-foreground/10 outline-hidden',
              className
            )}
            {...props}
          >
            {children}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading font-medium text-base', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
};
