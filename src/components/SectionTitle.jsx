function SectionTitle({ title, subtitle }) {
  return (
    <div className="mt-6 mb-3.5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
        <span className="h-4.5 w-1 rounded-full bg-gradient-to-b from-brand to-brand-2" />
        {title}
      </h2>
      {subtitle ? <p className="mt-1 ps-3 text-xs text-muted">{subtitle}</p> : null}
    </div>
  );
}

export default SectionTitle;