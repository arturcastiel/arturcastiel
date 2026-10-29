// Everything shown on the profile README. Edit here, then run `npm run build`:
// it regenerates ../assets/*.svg and ../README.md.

export const SITE = 'https://arturcastiel.github.io/';
export const SCHOLAR = 'https://scholar.google.com/citations?user=dRY2EE8AAAAJ';

// Markdown paragraph under the banner.
export const INTRO =
  'I develop numerical methods and open&#8209;source simulators for flow in porous media, from **multiscale finite volumes on unstructured grids** to **local grid refinement in [OPM Flow](https://opm-project.org/)**, applied to hydrogen storage, CCS and geothermal energy. Contributor to [OPM](https://github.com/OPM) with 70+ merged pull requests and credited author of [OPM Flow 2026.04](https://doi.org/10.5281/zenodo.20504835).';

export const PILLS = [
  { id: 'email', label: 'artur.castiel@tno.nl', icon: 'mail', href: 'mailto:artur.castiel@tno.nl', primary: true, alt: 'Email: artur.castiel@tno.nl' },
  { id: 'website', label: 'Website', icon: 'globe', href: SITE },
  { id: 'scholar', label: 'Google Scholar', icon: 'scholar', href: SCHOLAR },
  { id: 'orcid', label: 'ORCID', icon: 'orcid', href: 'https://orcid.org/0000-0003-0722-7024' },
  { id: 'researchgate', label: 'ResearchGate', icon: 'rg', href: 'https://www.researchgate.net/profile/Artur-Castiel' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/in/arturcastiel/' },
];

export const INTERESTS = [
  'Multiscale Methods', 'Finite Volume Methods', 'Unstructured Grids', 'Reservoir Simulation', 'Porous Media Flow',
  'Hydrogen Storage', 'CCS', 'Geothermal Energy', 'Discrete Fracture Models',
];

export const PUBLICATIONS = [
  { year: 2026, title: 'A graph-based algorithm for the CpEDFM-U to simulate two-phase flows in naturally fractured porous media', journal: 'Computers and Geotechnics', doi: 'https://doi.org/10.1016/j.compgeo.2026.107918' },
  { year: 2024, title: 'A nonlinear repair technique for the MPFA-D scheme in single-phase flow problems', journal: 'Journal of Computational Physics', doi: 'https://doi.org/10.1016/j.jcp.2024.112759' },
  { year: 2024, title: 'Simulation of two-phase flow in 3D fractured reservoirs using pEDFM-U', journal: 'Advances in Water Resources', doi: 'https://doi.org/10.1016/j.advwatres.2024.104679' },
  { year: 2024, title: 'A 3-D extension of the Multiscale Control Volume method', journal: 'Applied Mathematical Modelling', doi: 'https://doi.org/10.1016/j.apm.2024.05.045' },
  { year: 2022, title: 'An Algebraic Multiscale Solver using general unstructured grids (AMS-U)', journal: 'Applied Mathematical Modelling', doi: 'https://doi.org/10.1016/j.apm.2021.11.017' },
  { year: 2020, title: 'A Multiscale Control Volume framework using MsRSB and MPFA-D', journal: 'Journal of Petroleum Science and Engineering', doi: 'https://doi.org/10.1016/j.petrol.2019.106851' },
];

export const PUBLICATION_TOTALS = { journal: 8, total: 20 };

export const PROJECTS = [
  {
    id: 'opm', name: 'Open Porous Media', role: 'Contributor', href: 'https://opm-project.org/',
    desc: 'Community-driven open-source reservoir simulator for industrial-grade porous media simulation. I contribute to the core modules opm-common, opm-grid and opm-simulators: local grid refinement, compositional flash and dual-porosity models.',
    tech: ['C++', 'CMake', 'MPI'],
  },
  {
    id: 'darsim', name: 'DARSim', role: 'Main developer', href: 'https://gitlab.com/darsim/src',
    desc: 'Delft Advanced Reservoir Simulation: a MATLAB-based open-source 3D reservoir simulator developed at TU Delft for multiphase flow simulations in natural underground formations.',
    tech: ['MATLAB'],
  },
  {
    id: 'impress', name: 'IMPRESS', role: 'Creator', href: 'https://github.com/padmec-reservoir',
    desc: 'Intuitive Multilevel Preprocessor for Smart Simulation: a Python pre-processor for multiscale and multilevel simulation with hierarchical mesh data structures.',
    tech: ['Python', 'NumPy'],
  },
];

// Fourth card of the projects grid. Citations and h-index come from Google Scholar (update by hand).
export const METRICS = {
  href: SCHOLAR,
  stats: [
    { value: 8, label: 'Journal papers' },
    { value: 76, label: 'Citations' },
    { value: 5, label: 'h-index' },
    { value: 20, label: 'Publications' },
    { value: 2, label: 'Thesis awards' },
    { value: 70, suffix: '+', label: 'Merged OPM PRs' },
  ],
};

// Icons: simple-icons slugs, or the vendored MATLAB / Photoshop paths in build.mjs.
export const STACK = [
  { label: 'C++', icon: 'cplusplus' },
  { label: 'Python', icon: 'python' },
  { label: 'MATLAB', icon: 'matlab' },
  { label: 'CMake', icon: 'cmake' },
  { label: 'Git', icon: 'git' },
  { label: 'Linux', icon: 'linux' },
  { label: 'Docker', icon: 'docker' },
  { label: 'React', icon: 'react' },
  { label: 'HTML5', icon: 'html5' },
  { label: 'CSS3', icon: 'css' },
  { label: 'LaTeX', icon: 'latex' },
  { label: 'Photoshop', icon: 'photoshop' },
];

export const EDUCATION = [
  { program: 'Postdoctoral Studies', institution: 'Delft University of Technology', period: '2022 – 2024', flag: 'nl' },
  { program: 'Visiting PhD Student', institution: 'Swansea University', period: '2020 – 2021', flag: 'gb' },
  { program: 'PhD in Civil Engineering', institution: 'Federal University of Pernambuco', period: '2019 – 2022', flag: 'br', gpa: '4.0 / 4.0' },
  { program: 'MSc in Civil Engineering', institution: 'Federal University of Pernambuco', period: '2015 – 2019', flag: 'br', gpa: '3.9 / 4.0' },
  { program: 'BSc in Mechanical Engineering', institution: 'University of Pernambuco', period: '2006 – 2011', flag: 'br' },
];

export const AWARDS = [
  { id: 'litpeg', name: 'i-LITPEg Award', date: 'December 2023', title: 'Best Thesis of the Year 2023', org: 'Institute of Petroleum and Energy Research, Brazil' },
  { id: 'abmec', name: 'ABMEC Award · Honorable Mention', date: 'November 2023', title: 'Best Doctoral Thesis', org: 'Brazilian Association for Computational Methods in Engineering' },
];

// Section headings link to the matching section of the website.
export const SECTIONS = {
  interests: { title: 'Research interests', anchor: 'about' },
  publications: { title: 'Selected publications', anchor: 'publications', meta: `${PUBLICATION_TOTALS.journal} journal articles · ${PUBLICATION_TOTALS.total} in total` },
  projects: { title: 'Projects', anchor: 'projects', meta: 'Open-source research software' },
  stack: { title: 'Tech stack', anchor: 'skills' },
  education: { title: 'Education', anchor: 'education', meta: '2006 – 2024' },
  awards: { title: 'Awards', anchor: 'awards', meta: '2023' },
};
