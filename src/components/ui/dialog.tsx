"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { GripHorizontalIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/55",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  draggable = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  draggable?: boolean
}) {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const draggingRef = React.useRef(false)
  const startRef = React.useRef({ x: 0, y: 0 })
  const originRef = React.useRef({ x: 0, y: 0 })

  const clampOffset = React.useCallback((nextOffset: { x: number; y: number }) => {
    const margin = 24
    const element = contentRef.current
    const width = element?.offsetWidth ?? 0
    const height = element?.offsetHeight ?? 0

    const maxX = Math.max(0, (window.innerWidth - width) / 2 - margin)
    const maxY = Math.max(0, (window.innerHeight - height) / 2 - margin)

    return {
      x: Math.min(Math.max(nextOffset.x, -maxX), maxX),
      y: Math.min(Math.max(nextOffset.y, -maxY), maxY),
    }
  }, [])

  React.useEffect(() => {
    if (!draggable) {
      setOffset({ x: 0, y: 0 })
      return
    }

    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current) return

      const nextOffset = {
        x: originRef.current.x + (event.clientX - startRef.current.x),
        y: originRef.current.y + (event.clientY - startRef.current.y),
      }

      setOffset(clampOffset(nextOffset))
    }

    const onUp = () => {
      draggingRef.current = false
    }

    const onViewportChange = () => {
      setOffset((current) => clampOffset(current))
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("resize", onViewportChange)

    let resizeObserver: ResizeObserver | undefined
    if (typeof ResizeObserver !== "undefined" && contentRef.current) {
      resizeObserver = new ResizeObserver(onViewportChange)
      resizeObserver.observe(contentRef.current)
    }

    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("resize", onViewportChange)
      resizeObserver?.disconnect()
    }
  }, [clampOffset, draggable])

  const handleDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggable) return
    event.preventDefault()
    draggingRef.current = true
    startRef.current = { x: event.clientX, y: event.clientY }
    originRef.current = { ...offset }
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "!bg-[hsl(var(--background))] text-foreground !opacity-100 border border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] max-h-[92svh] overflow-y-auto overflow-x-hidden break-words [&_.grid>*]:min-w-0 [&_p]:break-words translate-x-[calc(-50%+var(--dialog-offset-x,0px))] translate-y-[calc(-50%+var(--dialog-offset-y,0px))] gap-4 rounded-lg p-6 shadow-xl duration-200 sm:max-w-lg",
          className
        )}
        style={{
          ["--dialog-offset-x" as string]: `${offset.x}px`,
          ["--dialog-offset-y" as string]: `${offset.y}px`,
        } as React.CSSProperties}
        {...props}
      >
        {draggable && (
          <button
            type="button"
            onPointerDown={handleDragStart}
            className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground cursor-move"
            aria-label="Mover ventana"
          >
            <GripHorizontalIcon className="h-4 w-4" />
          </button>
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
