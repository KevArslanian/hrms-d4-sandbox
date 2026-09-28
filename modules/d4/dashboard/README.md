# FR-D4-006 People Dashboard

The dashboard and View Employee route are read models. They read KPI, Performance, Competency, Development, and Training from their existing services and the shared employee/position fixture. KPI and Performance use the selected period; competency and development/training show current available records. A missing KPI or evaluation is shown as missing, never as zero or an inferred rating. Gap counts do not change when a training is completed. Supabase integration and 1:1 visual QC are later steps.
