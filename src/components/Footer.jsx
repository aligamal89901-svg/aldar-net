function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="px-4 py-4 text-center">
      <div className="text-xs font-semibold text-muted">الدار نت © {year}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">جميع الحقوق محفوظة</div>
    </footer>
  );
}

export default Footer;