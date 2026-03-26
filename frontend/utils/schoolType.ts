export type SchoolType =
  | 'maternelle'
  | 'primaire'
  | 'cycle_fondamental'
  | 'secondaire'
  | 'secondary'
  | string;

export const isSecondarySchool = (schoolType: SchoolType | null | undefined) => {
  if (!schoolType) return false;
  const st = String(schoolType).toLowerCase();
  return st === 'secondaire' || st === 'secondary' || st.includes('second');
};

export const isPrimaryLikeSchool = (schoolType: SchoolType | null | undefined) => {
  if (!schoolType) return false;
  const st = String(schoolType).toLowerCase();
  return st === 'primaire' || st === 'maternelle' || st === 'cycle_fondamental' || st.includes('prim') || st.includes('mater') || st.includes('fond');
};
