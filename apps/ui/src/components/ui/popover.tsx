import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { AnimatePresence, motion } from 'motion/react';

import { springPopup } from '#/lib/motion';
import { cn } from '#/lib/utils';

const PopoverOpenContext = React.createContext<boolean>(false);

function Popover({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: PopoverPrimitive.Root.Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false
  );
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  return (
    <PopoverOpenContext.Provider value={open}>
      <PopoverPrimitive.Root
        data-slot="popover"
        open={openProp}
        defaultOpen={defaultOpen}
        onOpenChange={(next, eventDetails) => {
          if (!isControlled) setUncontrolledOpen(next);
          onOpenChange?.(next, eventDetails);
        }}
        {...props}
      />
    </PopoverOpenContext.Provider>
  );
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  anchor,
  children,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'anchor'
  >) {
  const open = React.useContext(PopoverOpenContext);

  return (
    <AnimatePresence>
      {open && (
        <PopoverPrimitive.Portal keepMounted>
          <PopoverPrimitive.Positioner
            align={align}
            alignOffset={alignOffset}
            side={side}
            sideOffset={sideOffset}
            anchor={anchor}
            className="isolate z-50"
          >
            <PopoverPrimitive.Popup
              data-slot="popover-content"
              render={
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={springPopup}
                  style={{ transformOrigin: 'var(--transform-origin)' }}
                />
              }
              className={cn(
                'z-50 flex w-72 flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden',
                className
              )}
              {...props}
            >
              {children}
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="popover-header"
      className={cn('flex flex-col gap-0.5 text-sm', className)}
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn('font-heading font-medium', className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
