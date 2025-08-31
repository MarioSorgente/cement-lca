export const defaultDosageByConcreteStrength: Record<string, number> = {
'C20/25': 300,
'C25/30': 320,
'C30/37': 340,
'C35/45': 360,
'C40/50': 380,
'C45/55': 400,
'C50/60': 420,
}
export function getDefaultDosage(concreteStrength: string): number {
return defaultDosageByConcreteStrength[concreteStrength] ?? 340
}
