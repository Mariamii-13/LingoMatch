"use client"

import * as React from "react"
import { Camera, CameraOff, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PreJoinScreenProps {
  onFindPartner: (cameraEnabled: boolean, micEnabled: boolean) => void
  onCancel: () => void
}

export function PreJoinScreen({ onFindPartner, onCancel }: PreJoinScreenProps) {
  const [cameraEnabled, setCameraEnabled] = React.useState(true)
  const [micEnabled, setMicEnabled] = React.useState(true)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (!cameraEnabled) {
      stream?.getVideoTracks().forEach((t) => t.stop())
      setStream(null)
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => setCameraEnabled(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled])

  React.useEffect(() => () => { stream?.getTracks().forEach((t) => t.stop()) }, [stream])

  const bothOff = !cameraEnabled && !micEnabled

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">Set up your video</h1>
        <p className="mt-1 text-muted-foreground">Configure camera and microphone before matching</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Camera preview */}
        <div className="space-y-2">
          <div className="relative aspect-video overflow-hidden rounded-xl border bg-zinc-900">
            {cameraEnabled && stream ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <CameraOff className="size-10 text-white/20" />
                <p className="text-xs text-white/30">Camera is off</p>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">Your preview</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            bothOff ? "border-red-500/30 bg-red-500/5 text-red-400" : "bg-muted/40 text-muted-foreground"
          )}>
            <span className={cn("size-2 rounded-full", bothOff ? "bg-red-500" : "bg-emerald-500")} />
            {bothOff
              ? "At least one device must be on"
              : `Camera ${cameraEnabled ? "ON" : "OFF"} · Mic ${micEnabled ? "ON" : "OFF"}`
            }
          </div>

          {/* Camera toggle */}
          <div className={cn("flex items-center justify-between rounded-xl border p-4", !cameraEnabled && "border-red-500/30 bg-red-500/5")}>
            <div className="flex items-center gap-3">
              {cameraEnabled
                ? <Camera className="size-5 text-emerald-400" />
                : <CameraOff className="size-5 text-red-400" />
              }
              <div>
                <p className="text-sm font-medium">Camera</p>
                <p className={cn("text-xs", cameraEnabled ? "text-emerald-400" : "text-red-400")}>
                  {cameraEnabled ? "On" : "Off"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCameraEnabled((v) => !v)}
              className={cn("relative h-6 w-11 rounded-full transition-colors", cameraEnabled ? "bg-emerald-500" : "bg-zinc-600")}
            >
              <span className={cn("absolute top-1 size-4 rounded-full bg-white transition-transform", cameraEnabled ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>

          {/* Mic toggle */}
          <div className={cn("flex items-center justify-between rounded-xl border p-4", !micEnabled && "border-red-500/30 bg-red-500/5")}>
            <div className="flex items-center gap-3">
              {micEnabled
                ? <Mic className="size-5 text-emerald-400" />
                : <MicOff className="size-5 text-red-400" />
              }
              <div>
                <p className="text-sm font-medium">Microphone</p>
                <p className={cn("text-xs", micEnabled ? "text-emerald-400" : "text-red-400")}>
                  {micEnabled ? "On" : "Off"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMicEnabled((v) => !v)}
              className={cn("relative h-6 w-11 rounded-full transition-colors", micEnabled ? "bg-emerald-500" : "bg-zinc-600")}
            >
              <span className={cn("absolute top-1 size-4 rounded-full bg-white transition-transform", micEnabled ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>

          {!cameraEnabled && micEnabled && (
            <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
              💡 Voice-only mode — partner can hear you but not see you.
            </p>
          )}

          <Button
            size="lg"
            className="mt-2 h-12 bg-violet-600 text-base hover:bg-violet-700"
            disabled={bothOff}
            onClick={() => onFindPartner(cameraEnabled, micEnabled)}
          >
            Find Partner
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
