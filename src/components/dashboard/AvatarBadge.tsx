import Image from "next/image";

type AvatarBadgeProps = {
  name: string;
  image?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
};

const getInitials = (name: string) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "SW";
};

export default function AvatarBadge({
  name,
  image,
  sizeClassName = "h-16 w-16",
  textClassName = "text-lg",
  className = "",
}: AvatarBadgeProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(125,239,255,0.18),rgba(5,13,24,0.96))] ${sizeClassName} ${className}`.trim()}
    >
      {image ? (
        <Image
          src={image}
          alt={name}
          fill
          sizes="128px"
          className="object-cover"
          unoptimized={image.startsWith("data:")}
        />
      ) : (
        <span className={`font-[family-name:var(--font-display)] font-semibold text-white ${textClassName}`.trim()}>
          {initials}
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10" />
    </div>
  );
}
