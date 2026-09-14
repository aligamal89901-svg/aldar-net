export function formatRemaining(endISO) {
  if (!endISO) return null;
  const end = new Date(endISO);
  if (isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  if (diffMs <= 0) return { expired: true, text: "انتهت صلاحيته" };

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) {
    return { expired: false, days, hours, text: `متبقٍ ${days} يوم و ${hours} ساعة` };
  }
  if (hours >= 1) {
    return { expired: false, days: 0, hours, minutes, text: `متبقٍ ${hours} ساعة و ${minutes} دقيقة` };
  }
  return { expired: false, days: 0, hours: 0, minutes, text: `متبقٍ ${minutes} دقيقة` };
}

export function addDaysToNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString();
}

export function addHoursToNow(hours) {
  const d = new Date();
  d.setHours(d.getHours() + Number(hours || 0));
  return d.toISOString();
}