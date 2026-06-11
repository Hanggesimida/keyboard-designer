export type BackgroundVariant = "profile" | "admin"

interface BackgroundDecorProps {
  variant?: BackgroundVariant
}

export function BackgroundDecor({ variant = "profile" }: BackgroundDecorProps) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {variant === "profile" ? (
        <>
          <div
            className="absolute top-0 left-1/4 w-[500px] h-[400px] rounded-full opacity-[0.07]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(120,80,255,0.8) 0%, rgba(60,130,255,0.4) 50%, transparent 75%)",
              filter: "blur(100px)",
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full opacity-[0.05]"
            style={{
              background:
                "radial-gradient(circle, rgba(52,211,153,0.7) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute top-0 right-1/4 w-[500px] h-[400px] rounded-full opacity-[0.06]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(139,92,246,0.8) 0%, rgba(60,130,255,0.4) 50%, transparent 75%)",
            filter: "blur(100px)",
          }}
        />
      )}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  )
}
