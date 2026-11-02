export function toRawId(id: string) {
  return id.includes(":") ? id.split(":").slice(1).join(":") : id;
}
