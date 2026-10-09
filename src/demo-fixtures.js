// Fictional fixtures only. Never add claim-document content or actual personal information.
export const DEMO_INPUTS = [
  { claim_number:'DEMO-1001', title:'Premises incident review', insured:'Harbor Sample Hospitality LLC', claimant:'Jordan Sample', jurisdiction:'New York', analyst:'Demo Analyst', reviewer:'Demo Reviewer', incident_date:'2026-09-12', notes:'Synthetic demonstration only. No uploaded claim documents.', status:'New' },
  { claim_number:'DEMO-1002', title:'Property damage inquiry', insured:'Example Residences LLC', claimant:'Alex Example', jurisdiction:'New Jersey', analyst:'Demo Analyst', status:'Needs Information', notes:'Synthetic demonstration only. Awaiting incident information.' },
  { claim_number:'DEMO-1003', title:'Closed training matter', insured:'Sample Retail Group LLC', claimant:'Taylor Demo', jurisdiction:'Pennsylvania', status:'Archived', notes:'Synthetic demonstration only. Archived for training.' }
];

export function previewMatters() {
  return DEMO_INPUTS.map((input,index)=>({
    organization_id:'synthetic-preview',claimant:'',analyst:'',reviewer:'',recipient:'',incident_date:'',notes:'',
    ...input,
    id:`00000000-0000-4000-8000-00000000000${index+1}`,
    is_demo:1,version:1,created_at:'2026-10-09T16:00:00.000Z',updated_at:'2026-10-09T16:00:00.000Z'
  }));
}
