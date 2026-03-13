'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hue: number
  alpha: number
}

const PARTICLE_COUNT = 42
const CONNECTION_DISTANCE = 150
const POINTER_RADIUS = 220

export function ImmersiveAtlasBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const pointerRef = useRef({
    x: 0,
    y: 0,
    active: false,
    trail: [] as Array<{ x: number; y: number; alpha: number }>,
  })
  const reducedMotionRef = useRef(false)

  const seedParticles = useEffectEvent((width: number, height: number) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: 1.15 + Math.random() * 2.4,
      hue: index % 5 === 0 ? 191 : index % 3 === 0 ? 212 : 42,
      alpha: 0.26 + Math.random() * 0.5,
    }))
  })

  const resizeScene = useEffectEvent(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const parent = canvas.parentElement
    if (!parent) {
      return
    }

    const bounds = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.floor(bounds.width * dpr)
    canvas.height = Math.floor(bounds.height * dpr)
    canvas.style.width = `${bounds.width}px`
    canvas.style.height = `${bounds.height}px`

    const context = canvas.getContext('2d')
    context?.setTransform(dpr, 0, 0, dpr, 0, 0)

    seedParticles(bounds.width, bounds.height)

    if (!pointerRef.current.active) {
      pointerRef.current.x = bounds.width * 0.72
      pointerRef.current.y = bounds.height * 0.34
    }
  })

  const updatePointer = useEffectEvent((event: PointerEvent) => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) {
      return
    }

    const bounds = parent.getBoundingClientRect()
    pointerRef.current.x = event.clientX - bounds.left
    pointerRef.current.y = event.clientY - bounds.top
    pointerRef.current.active = true

    if (reducedMotionRef.current) {
      pointerRef.current.trail = []
      return
    }

    pointerRef.current.trail.unshift({
      x: pointerRef.current.x,
      y: pointerRef.current.y,
      alpha: 0.22,
    })
    pointerRef.current.trail = pointerRef.current.trail.slice(0, 10)
  })

  const clearPointer = useEffectEvent(() => {
    pointerRef.current.active = false
    pointerRef.current.trail = []
  })

  const handlePointerExit = useEffectEvent((event: MouseEvent) => {
    if (!event.relatedTarget) {
      clearPointer()
    }
  })

  const drawScene = useEffectEvent(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const pointer = pointerRef.current
    const particles = particlesRef.current

    context.clearRect(0, 0, width, height)

    const baseGlow = context.createRadialGradient(width * 0.74, height * 0.3, 0, width * 0.74, height * 0.3, width * 0.48)
    baseGlow.addColorStop(0, 'rgba(17, 96, 186, 0.16)')
    baseGlow.addColorStop(0.42, 'rgba(21, 47, 96, 0.10)')
    baseGlow.addColorStop(1, 'rgba(3, 6, 14, 0)')
    context.fillStyle = baseGlow
    context.fillRect(0, 0, width, height)

    if (pointer.active) {
      const pointerGlow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, POINTER_RADIUS)
      pointerGlow.addColorStop(0, 'rgba(244, 198, 88, 0.16)')
      pointerGlow.addColorStop(0.35, 'rgba(64, 150, 255, 0.10)')
      pointerGlow.addColorStop(1, 'rgba(5, 9, 18, 0)')
      context.fillStyle = pointerGlow
      context.fillRect(0, 0, width, height)
    }

    if (!reducedMotionRef.current) {
      for (const point of pointer.trail) {
        const trailGlow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 80)
        trailGlow.addColorStop(0, `rgba(111, 180, 255, ${point.alpha})`)
        trailGlow.addColorStop(1, 'rgba(6, 8, 16, 0)')
        context.fillStyle = trailGlow
        context.fillRect(0, 0, width, height)
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index]

      if (!reducedMotionRef.current) {
        if (pointer.active) {
          const dx = pointer.x - particle.x
          const dy = pointer.y - particle.y
          const distance = Math.hypot(dx, dy)

          if (distance < POINTER_RADIUS) {
            const force = (1 - distance / POINTER_RADIUS) * 0.016
            particle.vx += dx * force * 0.02
            particle.vy += dy * force * 0.02
          }
        }

        particle.x += particle.vx
        particle.y += particle.vy
        particle.vx *= 0.992
        particle.vy *= 0.992

        if (particle.x <= -8 || particle.x >= width + 8) {
          particle.vx *= -1
        }

        if (particle.y <= -8 || particle.y >= height + 8) {
          particle.vy *= -1
        }

        particle.x = Math.min(width + 8, Math.max(-8, particle.x))
        particle.y = Math.min(height + 8, Math.max(-8, particle.y))
      }

      for (let inner = index + 1; inner < particles.length; inner += 1) {
        const neighbor = particles[inner]
        const dx = particle.x - neighbor.x
        const dy = particle.y - neighbor.y
        const distance = Math.hypot(dx, dy)

        if (distance > CONNECTION_DISTANCE) {
          continue
        }

        const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.18
        context.strokeStyle = particle.hue === 42 && neighbor.hue === 42
          ? `rgba(246, 201, 104, ${opacity})`
          : `rgba(113, 177, 255, ${opacity})`
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(particle.x, particle.y)
        context.lineTo(neighbor.x, neighbor.y)
        context.stroke()
      }
    }

    for (const particle of particles) {
      context.beginPath()
      context.fillStyle = `hsla(${particle.hue} 100% 72% / ${particle.alpha})`
      context.shadowBlur = particle.hue === 42 ? 18 : 12
      context.shadowColor = particle.hue === 42 ? 'rgba(246, 201, 104, 0.36)' : 'rgba(101, 180, 255, 0.28)'
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      context.fill()
    }

    context.shadowBlur = 0

    if (pointer.active) {
      context.beginPath()
      context.fillStyle = 'rgba(247, 214, 132, 0.9)'
      context.arc(pointer.x, pointer.y, 2.6, 0, Math.PI * 2)
      context.fill()
    }

    if (!reducedMotionRef.current) {
      pointer.trail = pointer.trail
        .map((point, index) => ({
          ...point,
          alpha: Math.max(0, point.alpha - 0.022 - index * 0.0015),
        }))
        .filter((point) => point.alpha > 0.015)
    }
  })

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches
    }

    syncMotionPreference()
    resizeScene()

    window.addEventListener('resize', resizeScene)
    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('mouseout', handlePointerExit)
    window.addEventListener('blur', clearPointer)
    motionQuery.addEventListener('change', syncMotionPreference)

    let frameId = 0

    const loop = () => {
      drawScene()
      frameId = window.requestAnimationFrame(loop)
    }

    frameId = window.requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resizeScene)
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('mouseout', handlePointerExit)
      window.removeEventListener('blur', clearPointer)
      motionQuery.removeEventListener('change', syncMotionPreference)
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(210,227,255,0.12),transparent_28%),radial-gradient(circle_at_15%_15%,rgba(246,198,96,0.12),transparent_22%),linear-gradient(180deg,rgba(4,6,12,0.18),rgba(4,7,14,0.58))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:96px_96px] opacity-[0.08]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-95" aria-hidden="true" />
    </div>
  )
}
