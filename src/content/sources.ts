// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Every factual claim on the site traces back to one of these entries.
// `used` lists, in plain words, which claims each source backs.

export type SourceGroup = 'clinical' | 'testing' | 'mosquito' | 'virus' | 'prevention' | 'model' | 'local';

export interface Source {
  id: string;
  group: SourceGroup;
  /** Language of the cited work, when it is not English. */
  lang?: 'id';
  cite: string;
  url: string;
  doi?: string;
  used: { en: string; id: string };
}

export const SOURCES: Source[] = [
  {
    id: 'who2009',
    group: 'clinical',
    cite: 'World Health Organization. Dengue: guidelines for diagnosis, treatment, prevention and control. New edition. Geneva: WHO; 2009.',
    url: 'https://www.who.int/publications/i/item/9789241547871',
    used: {
      en: 'The three phases and their timing, defervescence at 37.5–38 °C, plasma leakage for 24–48 hours, reabsorption over 48–72 hours, the warning signs, a rise in haematocrit of 20% or more as a sign of plasma leakage, the patients who need closer care, home-care advice, incubation of 4–10 days in people and 8–12 days in the mosquito.',
      id: 'Tiga fase dan waktunya, defervesensi pada 37,5–38 °C, kebocoran plasma selama 24–48 jam, penyerapan kembali selama 48–72 jam, tanda bahaya, kenaikan hematokrit 20% atau lebih sebagai tanda kebocoran plasma, pasien yang perlu perawatan lebih ketat, saran perawatan di rumah, inkubasi 4–10 hari pada manusia dan 8–12 hari pada nyamuk.',
    },
  },
  {
    id: 'whofact',
    group: 'clinical',
    cite: 'World Health Organization. Dengue and severe dengue. Fact sheet, updated 21 August 2025.',
    url: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue',
    used: {
      en: 'Symptoms, the public list of warning signs, paracetamol and avoiding ibuprofen and aspirin, daytime biting, transmission to mosquitoes from 2 days before to 2 days after the fever, lifelong infectiousness of the mosquito, greater risk in a second infection, weekly cleaning of water containers, WHO vaccine recommendation.',
      id: 'Gejala, daftar tanda bahaya untuk masyarakat, parasetamol dan larangan ibuprofen serta aspirin, nyamuk menggigit siang hari, penularan ke nyamuk sejak 2 hari sebelum sampai 2 hari setelah demam, nyamuk menular seumur hidup, risiko lebih besar pada infeksi kedua, pembersihan wadah air mingguan, rekomendasi vaksin WHO.',
    },
  },
  {
    id: 'cdctest',
    group: 'testing',
    cite: 'Centers for Disease Control and Prevention. Testing for dengue virus: clinical testing guidance.',
    url: 'https://www.cdc.gov/dengue/hcp/diagnosis-testing/index.html',
    used: {
      en: 'NAAT and NS1 in the first 0–7 days, IgM from after day 3 and for about 3 months, IgM as the main test after day 7, IgG not used alone for acute diagnosis, cross-reactivity with Zika.',
      id: 'NAAT dan NS1 pada 0–7 hari pertama, IgM setelah hari ke-3 dan bertahan sekitar 3 bulan, IgM sebagai tes utama setelah hari ke-7, IgG tidak dipakai sendirian untuk diagnosis akut, reaksi silang dengan Zika.',
    },
  },
  {
    id: 'peeling2010',
    group: 'testing',
    cite: 'Peeling RW, Artsob H, Pelegrino JL, et al. Evaluation of diagnostic tests: dengue. Nat Rev Microbiol. 2010;8(12 Suppl):S30–S38.',
    url: 'https://doi.org/10.1038/nrmicro2459',
    doi: '10.1038/nrmicro2459',
    used: {
      en: 'Antibody patterns in first and second infections.',
      id: 'Pola antibodi pada infeksi pertama dan kedua.',
    },
  },
  {
    id: 'cdclife',
    group: 'mosquito',
    cite: 'Centers for Disease Control and Prevention. Life cycle of Aedes mosquitoes.',
    url: 'https://www.cdc.gov/mosquitoes/about/life-cycle-of-aedes-mosquitoes.html',
    used: {
      en: 'Eggs laid on container walls above the waterline, eggs surviving up to 8 months dry, hatching when water covers them, 7–10 days from egg to adult, only females bite.',
      id: 'Telur diletakkan di dinding wadah di atas permukaan air, telur bertahan kering hingga 8 bulan, menetas saat terendam, 7–10 hari dari telur sampai dewasa, hanya betina yang menggigit.',
    },
  },
  {
    id: 'ecdc',
    group: 'mosquito',
    cite: 'European Centre for Disease Prevention and Control. Aedes aegypti: factsheet for experts.',
    url: 'https://www.ecdc.europa.eu/en/disease-vectors/facts/mosquito-factsheets/aedes-aegypti',
    used: {
      en: 'The lyre-shaped mark and banded legs, daytime and dusk activity, preference for people, entering houses, a flight range of about 200 metres.',
      id: 'Tanda berbentuk lira dan kaki belang, aktif siang dan menjelang petang, lebih suka manusia, masuk ke rumah, jangkauan terbang sekitar 200 meter.',
    },
  },
  {
    id: 'kuhn2002',
    group: 'virus',
    cite: 'Kuhn RJ, Zhang W, Rossmann MG, et al. Structure of dengue virus: implications for flavivirus organization, maturation, and fusion. Cell. 2002;108(5):717–725.',
    url: 'https://doi.org/10.1016/s0092-8674(02)00660-8',
    doi: '10.1016/s0092-8674(02)00660-8',
    used: {
      en: 'The icosahedral scaffold of 90 E protein dimers that the 3D model follows.',
      id: 'Kerangka ikosahedral dari 90 dimer protein E yang diikuti model 3D.',
    },
  },
  {
    id: 'zhang2003',
    group: 'virus',
    cite: 'Zhang W, Chipman PR, Corver J, et al. Visualization of membrane protein domains by cryo-electron microscopy of dengue virus. Nat Struct Biol. 2003;10(11):907–912.',
    url: 'https://doi.org/10.1038/nsb990',
    doi: '10.1038/nsb990',
    used: {
      en: '180 copies each of the E and M proteins in the viral membrane.',
      id: 'Masing-masing 180 salinan protein E dan M di membran virus.',
    },
  },
  {
    id: 'katzelnick2017',
    group: 'virus',
    cite: 'Katzelnick LC, Gresh L, Halloran ME, et al. Antibody-dependent enhancement of severe dengue disease in humans. Science. 2017;358(6365):929–932.',
    url: 'https://doi.org/10.1126/science.aan6836',
    doi: '10.1126/science.aan6836',
    used: {
      en: 'Why a second infection can be more severe than the first.',
      id: 'Mengapa infeksi kedua bisa lebih berat daripada yang pertama.',
    },
  },
  {
    id: 'utarini2021',
    group: 'prevention',
    cite: 'Utarini A, Indriani C, Ahmad RA, et al. Efficacy of Wolbachia-infected mosquito deployments for the control of dengue. N Engl J Med. 2021;384(23):2177–2186.',
    url: 'https://doi.org/10.1056/NEJMoa2030243',
    doi: '10.1056/NEJMoa2030243',
    used: {
      en: 'The Yogyakarta trial: 77.1% protective efficacy against dengue and 86.2% against hospitalisation.',
      id: 'Uji di Yogyakarta: efikasi protektif 77,1% terhadap dengue dan 86,2% terhadap rawat inap.',
    },
  },
  {
    id: 'biswal2019',
    group: 'prevention',
    cite: 'Biswal S, Reynales H, Saez-Llorens X, et al. Efficacy of a tetravalent dengue vaccine in healthy children and adolescents. N Engl J Med. 2019;381(21):2009–2019.',
    url: 'https://doi.org/10.1056/NEJMoa1903869',
    doi: '10.1056/NEJMoa1903869',
    used: {
      en: 'TAK-003 efficacy of 80.2% against dengue in the first year.',
      id: 'Efikasi TAK-003 sebesar 80,2% terhadap dengue pada tahun pertama.',
    },
  },
  {
    id: 'tricou2024',
    group: 'prevention',
    cite: 'Tricou V, Yu D, Reynales H, et al. Long-term efficacy and safety of a tetravalent dengue vaccine (TAK-003): 4·5-year results from a phase 3, randomised, double-blind, placebo-controlled trial. Lancet Glob Health. 2024;12(2):e257–e270.',
    url: 'https://doi.org/10.1016/S2214-109X(23)00522-3',
    doi: '10.1016/S2214-109X(23)00522-3',
    used: {
      en: 'Cumulative efficacy of 61.2% against dengue and 84.1% against hospitalisation over about 4.5 years; no efficacy seen against type 3 in people who had never had dengue.',
      id: 'Efikasi kumulatif 61,2% terhadap dengue dan 84,1% terhadap rawat inap selama sekitar 4,5 tahun; tidak terlihat efikasi terhadap tipe 3 pada orang yang belum pernah terkena dengue.',
    },
  },
  {
    id: 'takeda2022',
    group: 'local',
    cite: 'Takeda. Takeda’s QDENGA (dengue tetravalent vaccine [live, attenuated]) approved in Indonesia for use regardless of prior dengue exposure. Press release, 22 August 2022.',
    url: 'https://takeda.com/newsroom/newsreleases/2022/takedas-qdenga-dengue-tetravalent-vaccine-live-attenuated-approved-in-indonesia-for-use-regardless-of-prior-dengue-exposure/',
    used: {
      en: 'BPOM approval in August 2022 for ages 6–45, two doses three months apart.',
      id: 'Persetujuan BPOM pada Agustus 2022 untuk usia 6–45 tahun, dua dosis dengan jarak tiga bulan.',
    },
  },
  {
    id: 'kemenkes3m',
    group: 'local',
    lang: 'id',
    cite: 'Kementerian Kesehatan RI. Pemberdayaan Jumantik untuk mendukung Gerakan PSN 3M Plus. 16 June 2016.',
    url: 'https://kemkes.go.id/eng/pemberdayaan-jumantik-untuk-mendukung-gerakan-psn-3m-plus',
    used: {
      en: 'PSN 3M Plus, the Jumantik role, and the one-house-one-Jumantik campaign.',
      id: 'PSN 3M Plus, peran Jumantik, dan Gerakan 1 Rumah 1 Jumantik.',
    },
  },
  {
    id: 'kemenkesimbau',
    group: 'local',
    lang: 'id',
    cite: 'Kementerian Kesehatan RI. Menkes imbau satu rumah ada satu Jumantik. 12 February 2016.',
    url: 'https://kemkes.go.id/eng/menkes-imbau-satu-rumah-ada-satu-jumantik',
    used: {
      en: 'The Plus measures: larvicide powder, repellent, bed nets, larva-eating fish.',
      id: 'Langkah Plus: bubuk larvasida, losion antinyamuk, kelambu, ikan pemakan jentik.',
    },
  },
  {
    id: 'wolbachia5',
    group: 'local',
    lang: 'id',
    cite: 'CNN Indonesia. Kemenkes sebar nyamuk Wolbachia di 5 kota: Jakbar hingga Kupang. 20 November 2023.',
    url: 'https://www.cnnindonesia.com/nasional/20231120133633-20-1026577/kemenkes-sebar-nyamuk-wolbachia-di-5-kota-jakbar-hingga-kupang',
    used: {
      en: 'The five pilot cities and the ministerial decree (KMK No. 1341) behind them.',
      id: 'Lima kota percontohan dan Keputusan Menteri Kesehatan (KMK No. 1341) yang mendasarinya.',
    },
  },
  {
    id: 'wolbachiajakarta',
    group: 'local',
    lang: 'id',
    cite: 'Metro TV News. Tekan DBD, Dinkes DKI sebar nyamuk Wolbachia mulai 4 Oktober. 25 September 2024.',
    url: 'https://metrotvnews.com/read/kWDCZQ74-tekan-dbd-dinkes-dki-sebar-nyamuk-wolbachia-mulai-4-oktober',
    used: {
      en: 'Releases in Jakarta Barat, run by the Jakarta health office with the Ministry of Health, starting on 4 October 2024 in RW 07, Kembangan Utara.',
      id: 'Pelepasan di Jakarta Barat oleh Dinas Kesehatan DKI bersama Kementerian Kesehatan, dimulai 4 Oktober 2024 di RW 07, Kembangan Utara.',
    },
  },
  {
    id: 'kemenkes119',
    group: 'local',
    lang: 'id',
    cite: 'Kementerian Kesehatan RI. Akses darurat medis 119 kini bisa melalui SATUSEHAT Mobile.',
    url: 'https://kemkes.go.id/id/akses-darurat-medis-119-kini-bisa-melalui-satusehat-mobile',
    used: {
      en: '119 as Indonesia’s medical emergency number.',
      id: '119 sebagai nomor gawat darurat medis Indonesia.',
    },
  },
  {
    id: 'pelanakuda',
    group: 'local',
    lang: 'id',
    cite: 'Alodokter. Mengenal siklus pelana kuda pada penyakit DBD. Updated 9 December 2024.',
    url: 'https://www.alodokter.com/mengenal-siklus-pelana-kuda-pada-penyakit-dbd',
    used: {
      en: 'How the term siklus pelana kuda is used in Indonesia.',
      id: 'Cara istilah siklus pelana kuda dipakai di Indonesia.',
    },
  },
  {
    id: 'esteva1998',
    group: 'model',
    cite: 'Esteva L, Vargas C. Analysis of a dengue disease transmission model. Math Biosci. 1998;150(2):131–151.',
    url: 'https://doi.org/10.1016/s0025-5564(98)10003-2',
    doi: '10.1016/s0025-5564(98)10003-2',
    used: {
      en: 'The host and vector model structure.',
      id: 'Struktur model inang dan vektor.',
    },
  },
  {
    id: 'ferguson2015',
    group: 'model',
    cite: 'Ferguson NM, Kien DTH, Clapham H, et al. Modeling the impact on virus transmission of Wolbachia-mediated blocking of dengue virus infection of Aedes aegypti. Sci Transl Med. 2015;7(279):279ra37.',
    url: 'https://doi.org/10.1126/scitranslmed.3010370',
    doi: '10.1126/scitranslmed.3010370',
    used: {
      en: 'wMel lowering the reproduction number of dengue by 66–75%, used for the Wolbachia slider.',
      id: 'wMel menurunkan angka reproduksi dengue sebesar 66–75%, dipakai untuk penggeser Wolbachia.',
    },
  },
  {
    id: 'andraud2012',
    group: 'model',
    cite: 'Andraud M, Hens N, Marais C, Beutels P. Dynamic epidemiological models for dengue transmission: a systematic review of structural approaches. PLoS One. 2012;7(11):e49085.',
    url: 'https://doi.org/10.1371/journal.pone.0049085',
    doi: '10.1371/journal.pone.0049085',
    used: {
      en: 'Parameter ranges: biting rate 0.3–1 per day, transmission probabilities, mosquito lifespan, infectious period.',
      id: 'Rentang parameter: laju gigitan 0,3–1 per hari, peluang penularan, umur nyamuk, masa menular.',
    },
  },
];
