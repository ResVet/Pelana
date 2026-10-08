// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// Teks Bahasa Indonesia. Bentuknya harus sama persis dengan en.ts; kunci yang
// hilang atau berlebih akan gagal saat pemeriksaan tipe.

import type { Copy } from './en.ts';

export const id: Copy = {
  lang: 'id',
  locale: 'id-ID',
  dir: 'ltr',

  site: {
    name: 'Pelana',
    tagline: 'Demam berdarah, dihitung per hari',
    description:
      'Cerita dan empat alat gratis tentang demam berdarah: hitung hari demam, pilih tes darah yang tepat, cek sarang nyamuk di rumah, dan lihat bagaimana wabah menyebar.',
    author: 'Raffa Gamadan Rifandi',
    authorRole: 'Mahasiswa kedokteran, Universitas Sriwijaya',
  },

  nav: {
    skip: 'Langsung ke isi',
    home: 'Beranda Pelana',
    story: 'Cerita',
    tools: 'Alat',
    sources: 'Sumber',
    about: 'Tentang',
    menu: 'Menu',
    close: 'Tutup',
    feverNow: 'Sedang demam?',
    settings: 'Pengaturan',
    language: 'English',
    languageShort: 'EN',
    languageLabel: 'Read in English',
    primary: 'Utama',
    toolsList: 'Alat',
  },

  tools: {
    tracker: {
      name: 'Hitung hari demam',
      short: 'Hitung hari',
      blurb: 'Masukkan kapan demam mulai. Lihat fase yang mungkin sedang berjalan, tanggal hari-hari kritis, dan tanda yang perlu diawasi.',
    },
    testing: {
      name: 'Tes apa, hari ke berapa',
      short: 'Tes darah',
      blurb: 'NS1, IgM, atau IgG? Setiap tes dengue bekerja pada rentang hari yang berbeda. Pilih hari demam untuk melihat tes mana yang berguna.',
    },
    house: {
      name: 'Cek rumah',
      short: 'Cek rumah',
      blurb: 'Telusuri rumah ruang demi ruang, temukan semua tempat nyamuk bisa bertelur, lalu pasang pengingat pemeriksaan mingguan di kalender.',
    },
    outbreak: {
      name: 'Simulasi wabah',
      short: 'Simulasi',
      blurb: 'Satu orang sakit pulang ke lingkungan berpenduduk 1.000 orang. Coba kuras penampungan air, Wolbachia, vaksinasi, dan fogging, lalu lihat apa yang berubah.',
    },
  },

  settings: {
    title: 'Pengaturan',
    intro: 'Pengaturan ini hanya disimpan di perangkat ini.',
    theme: { label: 'Warna', system: 'Ikuti perangkat', light: 'Terang', dark: 'Gelap' },
    text: { label: 'Ukuran huruf', normal: 'Normal', large: 'Besar', larger: 'Lebih besar' },
    contrast: { label: 'Kontras', standard: 'Standar', high: 'Tinggi' },
    motion: { label: 'Gerakan', system: 'Ikuti perangkat', full: 'Penuh', reduced: 'Dikurangi' },
    sound: { label: 'Suara', off: 'Mati', on: 'Nyala', note: 'Suara air dan ubin yang pelan. Mati sampai Anda menyalakannya.' },
    done: 'Selesai',
  },

  day: {
    before: 'Hari sebelum demam',
    during: 'Hari demam ke',
    railLabel: 'Hari-hari dalam cerita ini',
    jump: 'Lompat ke hari',
    labelBefore: '{n} hari sebelum demam',
    labelBeforeOne: '1 hari sebelum demam',
    labelDuring: 'Hari demam ke-{n}',
    labelAfter: 'Setelah demam',
    railItem: '{label} {n}',
    beforeShort: 'H−',
    duringShort: 'hari',
    phases: {
      egg: 'Telur',
      water: 'Di dalam air',
      adult: 'Nyamuk dewasa',
      virus: 'Virus di tubuh nyamuk',
      incubation: 'Masa inkubasi',
      fever: 'Demam',
      critical: 'Hari-hari kritis',
      recovery: 'Pemulihan',
    },
  },

  footer: {
    about:
      'Pelana adalah proyek Raffa Gamadan Rifandi, mahasiswa kedokteran Universitas Sriwijaya di Palembang. Situs ini untuk belajar dan tidak bisa mendiagnosis siapa pun. Jika Anda khawatir dengan seseorang yang demam, bawa ia ke dokter.',
    emergency: 'Gawat darurat medis di Indonesia: hubungi 119.',
    rights: '© 2026 Raffa Gamadan Rifandi. Seluruh hak dilindungi undang-undang.',
    license: 'Lisensi',
    nav: 'Tautan situs',
    sourceCode: 'Kode di GitHub',
    sources: 'Sumber',
    updated: 'Fakta diperiksa terhadap sumbernya pada Oktober 2026.',
  },

  common: {
    illustrative: 'Angka ilustrasi untuk satu pasien rekaan, bukan nilai normal.',
    showNumbers: 'Lihat angkanya',
    learnMore: 'Selengkapnya',
    openTool: 'Buka',
    print: 'Cetak',
    copy: 'Salin',
    copied: 'Tersalin',
    share: 'Kirim lewat WhatsApp',
    download: 'Unduh',
    reset: 'Mulai lagi',
    turnLeft: 'Putar ke kiri',
    turnRight: 'Putar ke kanan',
    yes: 'Ya',
    no: 'Tidak',
    notSure: 'Tidak tahu',
    noScript: 'Bagian ini butuh JavaScript. Bagian lain di halaman ini tetap bisa dibaca tanpanya.',
    noWebGL: 'Peramban Anda tidak bisa menjalankan grafik 3D, jadi halaman ini menampilkan gambar diam.',

    warning: {
      title: 'Segera ke rumah sakit jika ada salah satu tanda ini',
      items: [
        'Nyeri perut hebat, atau perut sakit saat ditekan',
        'Muntah terus-menerus',
        'Gusi atau hidung berdarah, muntah darah, BAB hitam, atau perdarahan dari vagina di luar haid',
        'Sangat mengantuk, bingung, gelisah, atau rewel',
        'Tangan dan kaki dingin, pucat, dan lembap',
        'Tidak buang air kecil selama 4 sampai 6 jam',
        'Napas cepat atau sesak',
        'Sangat haus',
      ],
      action:
        'Satu tanda saja sudah cukup. Segera ke IGD terdekat. Di Indonesia, hubungi 119 untuk ambulans.',
    },

    groupB: {
      title: 'Periksakan ke dokter lebih awal, walau tanpa tanda bahaya, untuk',
      items: [
        'bayi',
        'ibu hamil',
        'orang lanjut usia',
        'penderita diabetes, penyakit ginjal, obesitas, atau kelainan darah menahun',
        'orang yang tinggal sendiri atau jauh dari fasilitas kesehatan tanpa kendaraan yang bisa diandalkan',
      ],
      note: 'Menurut WHO, pasien-pasien ini mungkin perlu dipantau di rumah sakit menjelang hari-hari kritis.',
    },

    homeCare: {
      title: 'Di rumah, selama demam',
      items: [
        'Istirahat dan minum sesering mungkin: oralit, jus buah, sup, atau minuman lain yang mengandung garam dan gula.',
        'Untuk demam dan pegal, pakai parasetamol sesuai aturan pada kemasan, dengan jarak minimal enam jam antardosis.',
        'Jangan minum ibuprofen, aspirin, atau obat antinyeri antiradang lainnya. Obat-obat ini bisa memperberat perdarahan.',
        'Pastikan orang yang sakit buang air kecil setidaknya sekali setiap enam jam.',
      ],
    },
  },

  home: {
    title: 'Pelana: demam berdarah, dihitung per hari',
    description:
      'Demam berdarah dihitung per hari. Ikuti satu kasus dari telur nyamuk di ubin kamar mandi sampai hari-hari kritis setelah demam turun, dan kenali tanda bahaya yang mengharuskan pasien ke rumah sakit.',

    hero: {
      title: 'Demam berdarah dihitung per hari.',
      lede:
        'Kisah yang satu ini dimulai tiga puluh hari sebelum demam, di dinding keramik sebuah bak mandi, beberapa milimeter di atas permukaan air.',
      scroll: 'Gulir untuk memajukan hari',
      skip: 'Ada yang sedang demam? Hitung harinya',
    },

    beats: {
      eggs: {
        h: 'Telurnya menempel di dinding, tepat di atas permukaan air',
        p: [
          'Nyamuk betina _Aedes aegypti_ merekatkan telurnya satu per satu di dinding bagian dalam wadah, sedikit di atas air. Telurnya hitam dan sangat kecil, mudah dikira kotoran.',
          'Dalam keadaan kering, telur ini bisa bertahan hingga delapan bulan. Telur menetas begitu terendam air, dan di bak mandi itu terjadi setiap kali bak diisi sampai penuh.',
        ],
      },
      hatch: {
        h: 'Bak diisi, telur pun menetas',
        p: [
          'Larvanya kita kenal sebagai _jentik_. Jentik menggantung di permukaan air, bernapas lewat tabung pendek di ujung tubuhnya, lalu menyelam begitu ada gerakan di atasnya.',
        ],
      },
      week: {
        h: 'Tujuh sampai sepuluh hari',
        p: [
          'Jentik, lalu pupa, lalu nyamuk. Dari telur sampai dewasa butuh tujuh sampai sepuluh hari. Karena itulah penampungan air dianjurkan dibersihkan seminggu sekali.',
          'Menguras saja belum cukup. Telur tetap menempel di ubin dan akan menetas saat bak diisi lagi, jadi dindingnya juga perlu disikat.',
        ],
        drain: 'Kuras dan sikat bak mandinya',
        drained:
          'Di kamar mandi Anda, ceritanya bisa berhenti di sini. Di cerita ini, minggu itu tidak ada yang membersihkan bak mandi.',
        refill: 'Lanjutkan ceritanya',
      },
      adult: {
        h: 'Kecil, hitam, dan belang',
        p: [
          'Nyamuk dewasa merobek kulit pupanya di permukaan air, lalu berdiri di atas air sambil menunggu sayapnya mengeras.',
          '_Aedes aegypti_ bisa dikenali dari belang putih di kakinya yang hitam dan tanda keperakan berbentuk lira di punggungnya. Hanya nyamuk betina yang menggigit. Ia butuh protein dari darah untuk membuat telur.',
        ],
        look: 'Lihat lebih dekat',
        parts: {
          lyre: {
            label: 'Tanda lira',
            note: 'Sisik putih keperakan di dada nyamuk yang membentuk lira. Inilah cara tercepat membedakan spesies ini.',
          },
          legs: {
            label: 'Kaki',
            note: 'Hitam, dengan cincin putih di setiap sendi kakinya.',
          },
          proboscis: {
            label: 'Belalai',
            note: 'Mulutnya yang panjang. Nyamuk betina memakainya untuk menembus kulit dan mengisap darah, sambil mengeluarkan air liur saat makan.',
          },
          wings: {
            label: 'Sayap',
            note: 'Ramping dan terlipat rata di atas tubuh saat hinggap. Sayap ini mengepak ratusan kali per detik, itulah dengung yang Anda dengar di dekat telinga.',
          },
        },
        rotate: 'Seret untuk memutarnya',
      },
      habits: {
        h: 'Menggigit di siang hari, dekat rumah',
        p: [
          '_Aedes aegypti_ aktif pada siang hari dan menjelang petang, lebih suka darah manusia daripada hewan, dan tidak ragu masuk ke dalam rumah.',
          'Ia tidak terbang jauh: jangkauan terbangnya diperkirakan sekitar 200 meter. Nyamuk yang menggigit Anda kemungkinan besar tumbuh di air beberapa rumah dari tempat Anda.',
        ],
      },
      neighbour: {
        h: 'Ia menggigit tetangga yang sedang sakit dengue',
        p: [
          'Tetangga itu sedang di hari-hari awal demam, dan virusnya ada di dalam darah. Orang bisa menularkan dengue ke nyamuk sejak sekitar dua hari sebelum gejala muncul sampai sekitar dua hari setelah demamnya reda.',
          'Bersama darah itu, virusnya ikut terisap.',
        ],
      },
      inside: {
        h: 'Delapan sampai dua belas hari di tubuh nyamuk',
        p: [
          'Virus berkembang biak di usus nyamuk dan menyebar ke seluruh tubuhnya sampai mencapai kelenjar ludah. Pada suhu 25 sampai 28 °C, proses ini butuh sekitar delapan sampai dua belas hari, dan lebih singkat jika cuaca lebih panas. Setelah itu, nyamuk tersebut bisa menularkan virus seumur hidupnya.',
        ],
      },
      virion: {
        h: 'Seperti apa virusnya',
        p: [
          'Satu partikel virus dengue berukuran sekitar 50 nanometer, kira-kira seribu kali lebih tipis daripada sehelai rambut.',
          'Cangkang luarnya terdiri atas 180 salinan satu protein bernama E, yang berbaring rata di permukaan dalam 90 pasang. Tiga pasang berjajar membentuk satu rakit, dan 30 rakit menutupi seluruh partikel dengan pola tulang ikan. Di bawah cangkang ada membran lemak. Di dalamnya ada genom, seutas RNA sepanjang sekitar 11.000 basa.',
          'Ada empat tipe virus dengue, DENV-1 sampai DENV-4. Pernah terkena satu tipe tidak mencegah Anda tertular tipe lain, dan infeksi kedua lebih mungkin menjadi berat.',
        ],
        explode: 'Bongkar partikelnya',
        layers: ['Partikel utuh', 'Cangkang protein E', 'Membran', 'Inti dan RNA'],
        domains: 'Setiap protein E punya tiga bagian, diwarnai seperti di makalah penelitian: domain I (merah), domain II (kuning) dengan _en:fusion loop_ di ujungnya, dan domain III (biru).',
        rotate: 'Seret untuk memutarnya',
        model: 'Dibangun dengan kode dari susunan yang telah dipublikasikan: 30 rakit di sisi-sisi triakontahedron belah ketupat, satu rakit di atas setiap sumbu simetri lipat dua.',
      },
      you: {
        h: 'Lalu ia menggigit Anda',
        p: [
          'Selama empat sampai sepuluh hari seolah tidak terjadi apa-apa, sementara virus berkembang biak di dalam tubuh Anda.',
          'Sebagian besar infeksi dengue ringan atau tidak menimbulkan gejala sama sekali. Cerita ini mengikuti satu infeksi yang tidak tetap ringan.',
        ],
      },
      fever: {
        h: 'Demam datang tiba-tiba',
        p: [
          'Suhunya sering mencapai 40 °C. Sakit kepala hebat, nyeri di belakang mata, pegal otot dan sendi, mual, serta ruam sering menyertai. Fase pertama ini biasanya berlangsung dua sampai tujuh hari.',
        ],
      },
      breaks: {
        big: 'Lalu demamnya turun.',
        h: 'Hari ke-3 sampai ke-7: fase kritis',
        p: [
          'Rasanya seperti penyakitnya sudah selesai. Pada dengue, bagian paling berbahaya justru dimulai di sini.',
          'Antara hari ke-3 dan ke-7, suhu turun ke 37,5–38 °C atau lebih rendah dan bertahan di situ. Selama 24 sampai 48 jam berikutnya, pembuluh darah terkecil menjadi bocor. Plasma, cairan darah yang berwarna kuning pucat, merembes ke jaringan, sementara sel darah merah tetap di dalam pembuluh. Darah yang tersisa pun menjadi lebih kental.',
          'Jika plasma yang keluar cukup banyak, tekanan darah turun dan organ tubuh tidak lagi mendapat cukup darah. Itulah syok dengue.',
        ],
      },
      platelets: {
        h: 'Semua orang menanyakan trombosit',
        p: [
          'Di samping ranjang pasien, pertanyaan pertama biasanya “trombositnya berapa?” Trombosit memang turun pada dengue, dan trombosit yang sangat rendah meningkatkan risiko perdarahan.',
          'Namun syok berasal dari kebocoran, dan kebocoran itu tampak pada angka lain: hematokrit, yaitu porsi darah yang berupa sel darah merah. Hematokrit yang naik bersamaan dengan trombosit yang turun cepat termasuk tanda bahaya yang diawasi dokter. Kenaikan 20% atau lebih dari nilai biasanya adalah salah satu tanda baku kebocoran plasma.',
        ],
        slip: 'Hasil laboratorium',
        slipRows: { hct: 'Hematokrit', plt: 'Trombosit', wbc: 'Leukosit' },
        slipDay: 'Hari ke-{n}',
      },
      warning: {
        h: 'Tanda yang tidak boleh ditunda',
        p: ['Diambil dari pedoman dengue WHO, ditulis dengan kata-kata sehari-hari.'],
        cta: 'Hitung hari demam seseorang',
      },
      recovery: {
        h: 'Hari ke-7 dan seterusnya: cairan kembali',
        p: [
          'Jika kebocoran berhenti tepat waktu, tubuh menarik kembali cairan yang keluar ke dalam pembuluh darah selama dua sampai tiga hari berikutnya. Nafsu makan kembali dan pasien lebih sering buang air kecil.',
          'Sebagian orang mendapat ruam gatal yang oleh dokter disebut “_en:isles of white in the sea of red_”, pulau-pulau putih di lautan merah, dan denyut jantungnya bisa melambat untuk sementara.',
          'Fase pemulihan punya risikonya sendiri di rumah sakit. Cairan yang tadinya bocor kembali masuk ke pembuluh darah, jadi dokter memperlambat infus agar paru-paru tidak kebanjiran cairan.',
        ],
      },
      saddle: {
        h: 'Mengapa disebut pelana',
        p: [
          'Di Indonesia, perjalanan penyakit ini dikenal sebagai _siklus pelana kuda_. Demam naik, turun, dan pada sebagian orang naik sedikit lagi sebelum reda, sehingga kurvanya mirip pelana.',
          'Tidak semua orang mengalami kenaikan kedua. Semua orang melewati lekukan di tengahnya, dan lekukan itulah yang harus diawasi.',
        ],
        chart: {
          title: 'Satu pasien rekaan, hari demi hari',
          temp: 'Suhu',
          hct: 'Hematokrit',
          plt: 'Trombosit',
          critical: 'Hari-hari kritis',
          day: 'Hari',
        },
      },
      again: {
        h: 'Hitungan dimulai lagi di bak mandi',
        p: [
          'Nyamuknya masih berkembang biak setelah demam hilang, dan infeksi dengue kedua lebih mungkin menjadi berat daripada yang pertama.',
        ],
      },
    },

    prevention: {
      h: 'Yang benar-benar menghentikannya',
      psn: {
        h: '3M Plus, seminggu sekali',
        p: [
          'Program rumah tangga di Indonesia bernama PSN 3M Plus. Tiga M-nya adalah _menguras_ (menguras dan menyikat penampungan air), _menutup_ (menutup rapat tempat penyimpanan air), dan _mendaur ulang_ (memanfaatkan kembali atau mendaur ulang barang yang bisa menampung air hujan). Plus mencakup sisanya: bubuk larvasida (_abate_) untuk wadah yang tidak bisa dikuras, ikan pemakan jentik, losion antinyamuk, dan kelambu.',
          'WHO memberi saran yang sama: tutup, kosongkan, dan bersihkan wadah penampungan air setiap minggu. Gerakan nasional meminta setiap rumah menunjuk satu orang sebagai _Jumantik_ untuk memeriksa jentik di rumahnya.',
        ],
        cta: 'Cek rumah',
      },
      wolbachia: {
        h: 'Nyamuk ber-Wolbachia',
        p: [
          '_Wolbachia_ adalah bakteri yang membuat _Aedes aegypti_ lebih sulit menularkan dengue. Dalam uji acak di Yogyakarta, risiko dengue di wilayah tempat nyamuk ini dilepaskan 77% lebih rendah daripada di wilayah tanpa nyamuk ber-Wolbachia, dan risiko dirawat di rumah sakit karena dengue 86% lebih rendah.',
          'Kementerian Kesehatan kemudian memulai pelepasan di sebagian wilayah Jakarta Barat, Bandung, Semarang, Bontang, dan Kupang.',
        ],
        cta: 'Jalankan simulasi wabah',
      },
      vaccine: {
        h: 'Vaksin',
        p: [
          'Indonesia menyetujui vaksin Qdenga (TAK-003) pada Agustus 2022 untuk usia 6 sampai 45 tahun, diberikan dua dosis dengan jarak tiga bulan. Dalam uji klinis utamanya, vaksin ini mencegah 80% kasus dengue pada tahun pertama. Selama empat setengah tahun, vaksin ini mencegah 61% kasus dan 84% rawat inap.',
          'Pada relawan uji yang belum pernah terkena dengue, vaksin ini tidak menunjukkan perlindungan terhadap tipe 3, dan kasus tipe 4 terlalu sedikit untuk dinilai. Saat ini WHO menganjurkannya untuk anak usia 6 sampai 16 tahun di daerah dengan penularan tinggi. Tanyakan kepada dokter apakah vaksin ini cocok untuk Anda.',
        ],
      },
    },

    toolsSection: {
      h: 'Empat alat',
      p: 'Setelah kunjungan pertama, semuanya bisa dipakai tanpa internet, dan apa pun yang Anda ketik tidak pernah keluar dari perangkat Anda.',
    },
  },

  tracker: {
    title: 'Hitung hari demam',
    description:
      'Masukkan kapan demam berdarah dimulai, lalu lihat hari sakit ke berapa, fase yang mungkin sedang berjalan, tanggal hari-hari kritis, dan tanda bahaya yang perlu diawasi.',
    lede: 'Masukkan kapan demam dimulai. Pelana menghitung hari sakit ke berapa sekarang dan kapan hari-hari kritis jatuh, supaya Anda tahu kapan harus paling waspada.',
    disclaimer:
      'Halaman ini hanya menghitung hari. Halaman ini tidak bisa menentukan apakah seseorang terkena dengue atau seberapa berat sakitnya. Hanya dokter dan tes darah yang bisa.',
    form: {
      legend: 'Kapan demam dimulai?',
      name: 'Nama (boleh dikosongkan)',
      namePlaceholder: 'Misalnya: Adik',
      nameHint: 'Berguna jika Anda merawat lebih dari satu orang.',
      date: 'Tanggal',
      time: 'Kira-kira jam berapa',
      times: {
        morning: 'Pagi (06.00 sampai 12.00)',
        afternoon: 'Siang (12.00 sampai 18.00)',
        evening: 'Malam (18.00 sampai 24.00)',
        night: 'Dini hari (00.00 sampai 06.00)',
      },
      submit: 'Hitung harinya',
      future: 'Tanggal itu belum terjadi. Pilih hari saat demam dimulai.',
      tooOld: 'Itu lebih dari tiga minggu lalu. Hitungan hari hanya berguna selama dua minggu pertama sakit.',
      missing: 'Pilih tanggal demam dimulai.',
    },
    result: {
      heading: 'Hari demam ke-{n}',
      headingNamed: '{name}: hari demam ke-{n}',
      since: 'Dihitung sejak {date}. Hari ke-1 adalah 24 jam pertama demam.',
      phases: {
        early: {
          h: 'Fase demam',
          p: 'Suhu biasanya tinggi pada fase ini. Pastikan orang yang sakit banyak minum dan beristirahat. Hari-hari kritis biasanya dimulai antara hari ke-3 dan ke-7, sering kali saat demam mulai turun.',
        },
        critical: {
          h: 'Hari-hari kritis',
          p: 'Inilah saat plasma bisa bocor, sering kali tepat ketika demam turun. Suhu yang turun bukan tanda bahwa bahaya sudah lewat. Periksa tanda bahaya beberapa kali sehari dan pastikan orang yang sakit terus minum.',
        },
        late: {
          h: 'Kemungkinan sudah melewati hari-hari kritis',
          p: 'Sebagian besar orang sudah melewati fase kritis pada hari ini, terutama jika tidak ada tanda bahaya. Nafsu makan biasanya kembali. Tetap awasi tanda bahaya sampai orang yang sakit benar-benar pulih, dan bawa ke dokter jika ada yang memburuk.',
        },
        over: {
          h: 'Lebih dari dua minggu',
          p: 'Hitungan hari sudah tidak berguna lagi. Jika orang yang sakit belum juga membaik, ia perlu diperiksa dokter.',
        },
      },
      window: 'Paling waspada dari {start} sampai {end}.',
      windowPast: 'Hari-hari kritis yang biasa adalah {start} sampai {end}.',
      calendarLabel: 'Sepuluh hari pertama',
      today: 'Hari ini',
    },
    usual: {
      h: 'Biasanya, hari demi hari',
      early: 'Hari ke-1 sampai ke-3',
      critical: 'Hari ke-3 sampai ke-7',
      late: 'Setelah hari ke-7',
    },
    log: {
      h: 'Catatan untuk dokter',
      p: 'Catat suhu, berapa banyak orang yang sakit minum, dan kapan ia buang air kecil. Catatan ini berguna bagi dokter dan membantu Anda melihat perubahan.',
      temp: 'Suhu (°C)',
      tempPlaceholder: '38,5',
      when: 'Waktu',
      drank: 'Minum sejak catatan terakhir',
      drankOptions: { none: 'Tidak dicatat', little: 'Sangat sedikit', some: 'Sedang', plenty: 'Banyak' },
      urine: 'Buang air kecil dalam 6 jam terakhir',
      note: 'Catatan lain',
      add: 'Tambah catatan',
      empty: 'Belum ada catatan.',
      remove: 'Hapus',
      added: 'Catatan ditambahkan.',
      removed: 'Catatan dihapus.',
      chartTitle: 'Hasil pengukuran suhu',
      invalidTemp: 'Masukkan suhu antara 34 dan 43 °C.',
    },
    export: {
      h: 'Simpan dan bawa',
      calendar: 'Tambahkan hari-hari kritis ke kalender',
      calendarHint: 'Berkas kalender dengan tiga pengingat sehari, dari hari ke-3 sampai ke-7, untuk memeriksa tanda bahaya.',
      copy: 'Salin ringkasan untuk dokter',
      whatsapp: 'Kirim ringkasan lewat WhatsApp',
      print: 'Cetak',
      summaryTitle: 'Ringkasan demam',
      summaryStart: 'Demam mulai: {date}',
      summaryDay: 'Hari ini hari demam ke-{n}.',
      summaryNotes: 'Catatan:',
      eventTitle: 'Cek dengue: hari demam ke-{n}',
      eventBody: 'Periksa tanda bahaya: nyeri perut hebat, muntah terus-menerus, perdarahan, sangat haus, sangat mengantuk atau gelisah, tangan dan kaki dingin lembap, tidak buang air kecil 4 sampai 6 jam, napas cepat. Jika ada, segera ke IGD atau hubungi 119.',
    },
    privacy: {
      h: 'Data Anda',
      p: 'Semua yang Anda masukkan hanya tersimpan di peramban pada perangkat ini. Tidak ada yang dikirim ke mana pun.',
      clear: 'Hapus semuanya',
      confirm: 'Hapus semua nama, tanggal, dan catatan yang tersimpan di perangkat ini?',
      cleared: 'Terhapus.',
    },
    people: { label: 'Orang', add: 'Orang lain', untitled: 'Tanpa nama' },
  },

  testing: {
    title: 'Tes dengue apa, di hari ke berapa',
    description:
      'NS1, PCR, IgM, atau IgG: tes darah dengue mana yang berguna di hari demam ke berapa, dan bagaimana infeksi kedua mengubah hasilnya.',
    lede: 'Tes dengue mencari hal yang berbeda-beda, dan masing-masing bekerja pada rentang hari yang berbeda. Pilih hari demam untuk melihat tes mana yang kemungkinan berguna.',
    controls: {
      day: 'Hari demam',
      dayValue: 'Hari ke-{n}',
      before: 'Apakah orang ini pernah terkena dengue sebelumnya?',
      beforeOptions: { no: 'Belum', yes: 'Pernah', unknown: 'Tidak tahu' },
      fromTracker: 'Memakai hari dari Hitung hari demam',
    },
    chart: {
      title: 'Kapan setiap tes bisa mendeteksi dengue',
      day: 'Hari sakit',
      strong: 'Biasanya positif',
      weak: 'Kadang positif',
      today: 'Hari yang dipilih',
    },
    tests: {
      pcr: { name: 'PCR', full: 'RT-PCR (materi genetik virus)' },
      ns1: { name: 'NS1', full: 'Antigen NS1 (protein virus)' },
      igm: { name: 'IgM', full: 'Antibodi IgM (respons imun awal)' },
      igg: { name: 'IgG', full: 'Antibodi IgG (respons imun lanjut atau lama)' },
      cbc: { name: 'Darah rutin', full: 'Pemeriksaan darah lengkap (trombosit dan hematokrit)' },
    },
    advice: {
      early: {
        h: 'Hari ke-1 sampai ke-3: cari virusnya',
        p: 'NS1 atau PCR bisa menemukan virus di dalam darah sejak hari pertama. IgM sering masih negatif sedini ini, jadi IgM negatif belum menyingkirkan dengue.',
      },
      middle: {
        h: 'Hari ke-4 sampai ke-7: dua tes sekaligus',
        p: 'NS1 dan IgM bersama-sama menangkap sebagian besar kasus. NS1 negatif belum menyingkirkan dengue, terutama di akhir rentang ini atau pada infeksi kedua.',
      },
      late: {
        h: 'Setelah hari ke-7: antibodi',
        p: 'IgM menjadi tes utama, dan hasilnya tetap positif sekitar tiga bulan. NS1 dan PCR sering sudah negatif pada titik ini.',
      },
      secondary:
        'Pada infeksi kedua, IgG naik lebih awal dan tinggi, IgM bisa tetap rendah, dan tes NS1 lebih sering meleset.',
      igg: 'IgG saja tidak bisa memastikan dengue yang sedang berlangsung. IgG tetap positif bertahun-tahun setelah infeksi sebelumnya.',
      cbc: 'Apa pun hasilnya, dokter mengulang pemeriksaan darah rutin selama hari-hari kritis untuk memantau trombosit dan hematokrit.',
      crossReact:
        'Tes antibodi juga bisa bereaksi terhadap virus sekerabat seperti Zika, jadi dokter membacanya bersama gejala pasien.',
    },
    note: 'Batang-batang ini menunjukkan rentang umum dari panduan CDC dan WHO. Setiap tes dan setiap orang bisa berbeda.',
  },

  house: {
    title: 'Cek rumah dari sarang nyamuk',
    description:
      'Telusuri rumah ruang demi ruang dan temukan tempat Aedes aegypti berkembang biak, lengkap dengan cara menanganinya dan pengingat mingguan untuk kalender Anda.',
    lede: '_Aedes aegypti_ berkembang biak di wadah yang menampung air, kebanyakan di dalam dan di sekitar rumah. Ketuk setiap titik untuk memeriksanya.',
    progress: '{n} dari {total} titik sudah ditangani',
    done: 'Semua titik sudah ditangani. Ulangi minggu depan: sebutir telur hanya butuh tujuh sampai sepuluh hari untuk menjadi nyamuk.',
    actions: {
      drain: 'Kuras dan sikat',
      cover: 'Tutup',
      recycle: 'Daur ulang atau buang',
      plus: 'Plus',
    },
    mark: 'Tandai selesai',
    unmark: 'Belum selesai',
    rooms: { bathroom: 'Kamar mandi', kitchen: 'Dapur', living: 'Ruang tamu', yard: 'Halaman', roof: 'Atap' },
    spots: {
      tub: { name: 'Bak mandi', action: 'drain', text: 'Kuras dan sikat dindingnya seminggu sekali. Telur tetap menempel di ubin walau airnya sudah habis.' },
      bucket: { name: 'Ember atau drum air', action: 'cover', text: 'Tutup rapat. Jika tidak bisa ditutup, kosongkan dan sikat setiap minggu.' },
      dispenser: { name: 'Tatakan dispenser', action: 'drain', text: 'Kosongkan dan lap tatakan tetesannya setiap beberapa hari.' },
      fridge: { name: 'Tatakan kulkas', action: 'drain', text: 'Tarik kulkasnya dan kosongkan tatakan di bagian belakang.' },
      vase: { name: 'Vas bunga', action: 'drain', text: 'Ganti airnya dan sikat vasnya setidaknya seminggu sekali.' },
      saucer: { name: 'Tatakan pot', action: 'drain', text: 'Kosongkan tatakannya, atau isi dengan pasir agar air tidak menggenang.' },
      anttrap: { name: 'Tatakan kaki lemari', action: 'drain', text: 'Kosongkan dan isi ulang wadah air di bawah kaki lemari setiap minggu.' },
      birdbath: { name: 'Tempat minum burung', action: 'drain', text: 'Ganti airnya dan bilas wadahnya setiap minggu.' },
      tyre: { name: 'Ban bekas', action: 'recycle', text: 'Singkirkan, simpan di bawah atap, atau lubangi agar tidak bisa menampung hujan.' },
      litter: { name: 'Kaleng, botol, dan gelas bekas', action: 'recycle', text: 'Buang atau daur ulang. Sedikit air hujan di dalamnya pun cukup untuk jentik.' },
      gutter: { name: 'Talang air', action: 'drain', text: 'Bersihkan daun-daunnya agar air hujan bisa mengalir.' },
      tank: { name: 'Tandon air di atap', action: 'cover', text: 'Tutup rapat agar nyamuk tidak bisa masuk dan bertelur.' },
      pond: { name: 'Kolam atau air mancur', action: 'plus', text: 'Pelihara ikan pemakan jentik, misalnya ikan guppy.' },
    },
    reminder: {
      h: 'Pemeriksaan mingguan di kalender',
      p: 'Pilih hari dan jam. Pelana membuat berkas kalender yang berulang setiap minggu, lengkap dengan daftar periksa ini.',
      day: 'Hari',
      time: 'Jam',
      days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
      button: 'Unduh pengingat mingguan',
      eventTitle: 'Cek jentik mingguan (PSN 3M Plus)',
    },
    print: 'Cetak daftar periksa',
    listHeading: 'Semua titik',
    reset: 'Hapus centang',
    viewHint: 'Seret untuk melihat sekeliling rumah',
  },

  outbreak: {
    title: 'Simulasi wabah dengue',
    description:
      'Model pembelajaran dengue di lingkungan berpenduduk 1.000 orang. Ubah sarang nyamuk, Wolbachia, vaksinasi, dan fogging, lalu lihat bagaimana wabahnya berubah.',
    lede: 'Satu lingkungan berpenduduk 1.000 orang, nyamuk-nyamuknya, dan satu orang yang pulang membawa dengue. Ubah apa yang dilakukan warganya, lalu jalankan delapan bulan ke depan.',
    controls: {
      h: 'Yang dilakukan warga',
      breeding: 'Sarang nyamuk yang dihilangkan',
      breedingHint: 'Wadah yang dikuras, ditutup, atau dibuang (PSN 3M Plus)',
      wolbachia: 'Nyamuk yang membawa Wolbachia',
      wolbachiaHint: 'Porsi Aedes aegypti setempat yang membawa galur wMel',
      vaccine: 'Warga yang divaksin',
      vaccineHint: 'Dua dosis, sebelum wabah dimulai',
      season: 'Musim',
      seasons: { rainy: 'Hujan', dry: 'Kemarau' },
      fog: 'Lakukan fogging',
      fogHint: 'Membunuh nyamuk yang terbang selama beberapa hari. Jentik di dalam air tetap hidup.',
      fogged: 'Fogging pada hari ke-{n}',
      reset: 'Atur ulang',
      presets: 'Coba',
      presetList: {
        nothing: 'Tidak berbuat apa-apa',
        fog: 'Fogging saja',
        psn: 'Bersih-bersih tiap minggu',
        wolbachia: 'Wolbachia',
        all: 'Semuanya sekaligus',
      },
    },
    results: {
      h: 'Wabah dengan pilihan Anda',
      infected: 'Orang yang tertular',
      peak: 'Minggu tersibuk',
      peakValue: 'Minggu ke-{n}',
      r0: 'Angka reproduksi di awal',
      r0Hint: 'Berapa orang yang tertular dari kasus pertama lewat nyamuk. Di atas 1, wabahnya membesar.',
      none: 'Tidak ada wabah',
      chartCases: 'Infeksi baru per minggu',
      chartMosquitoes: 'Nyamuk dewasa',
      baseline: 'Tanpa tindakan',
      current: 'Dengan pilihan Anda',
      week: 'Minggu',
    },
    city: {
      label: 'Setiap ubin adalah satu orang',
      susceptible: 'Bisa tertular',
      exposed: 'Tertular, belum sakit',
      infectious: 'Sakit dan menularkan',
      recovered: 'Sembuh',
      protected: 'Terlindungi vaksin',
      play: 'Putar',
      pause: 'Jeda',
      day: 'Hari ke-{n}',
      scrub: 'Hari yang ditampilkan',
      counts: 'Hari ke-{n}: {s} bisa tertular, {e} tertular tetapi belum sakit, {i} sakit, {r} sembuh, {p} terlindungi vaksin.',
    },
    model: {
      h: 'Isi modelnya',
      p: [
        'Manusia berpindah di antara empat keadaan: rentan, terpapar (tertular tetapi belum menularkan), menularkan, dan sembuh. Nyamuk punya tahap air dan tiga keadaan dewasa: rentan, terpapar selama virus berinkubasi, dan menularkan seumur hidup. Kedua populasi saling menularkan lewat gigitan. Inilah struktur inang dan vektor yang umum dipakai dalam model dengue.',
        'Persamaannya diselesaikan di _en:thread_ latar dengan metode Runge–Kutta orde empat, setengah hari per langkah.',
      ],
      table: { parameter: 'Parameter', value: 'Nilai', source: 'Sumber' },
      params: {
        biting: 'Gigitan per nyamuk per hari',
        bh: 'Peluang satu gigitan menulari manusia',
        bv: 'Peluang satu gigitan menulari nyamuk',
        eip: 'Inkubasi di tubuh nyamuk',
        iip: 'Inkubasi di tubuh manusia',
        infectious: 'Masa menular pada manusia',
        lifespan: 'Umur nyamuk dewasa',
        development: 'Telur sampai dewasa',
        wolbachia: 'Penurunan R jika semua nyamuk membawa wMel',
        vaccine: 'Perlindungan vaksin, di sini dianggap mencegah infeksi',
        fog: 'Fogging',
        density: 'Nyamuk dewasa per orang, musim hujan',
        dry: 'Kapasitas berkembang biak di musim kemarau',
      },
      units: { day: 'hari', perDay: 'per hari' },
      chosen: 'Dipilih untuk model ini',
      vaccineSource: 'Biswal 2019: {pct} terhadap dengue bergejala pada tahun pertama',
      fogValue: '70% nyamuk dewasa yang terbang mati per hari, selama 3 hari',
      dryValue: '45% dari musim hujan',
      equations: 'Lihat persamaannya',
      limits:
        'Model ini untuk membangun intuisi. Model ini menganggap belum ada warga yang kebal di awal, dan tidak memasukkan orang yang bepergian antarlingkungan, empat tipe virus, serta curah hujan dari minggu ke minggu. Angka-angkanya bukan ramalan untuk tempat mana pun.',
    },
  },

  sources: {
    title: 'Sumber',
    description: 'Pedoman, penelitian, dan data di balik Pelana, serta cara setiap gambar dan model dibuat.',
    lede: 'Setiap angka di situs ini berasal dari salah satu sumber berikut. Jika Anda menemukan kesalahan, laporkan lewat GitHub.',
    groups: {
      clinical: 'Penyakit dan perawatan',
      testing: 'Pemeriksaan',
      mosquito: 'Nyamuknya',
      virus: 'Virusnya',
      prevention: 'Pencegahan',
      model: 'Model wabah',
      local: 'Indonesia',
    },
    method: {
      h: 'Cara gambar-gambarnya dibuat',
      items: [
        'Tidak ada foto atau model 3D unduhan di situs ini. Kamar mandi, nyamuk, virus, dan rumahnya dibangun dengan kode setiap kali halaman dibuka, lalu digambar dengan WebGL.',
        'Partikel virus mengikuti susunan virus dengue matang dari mikroskopi krioelektron: 90 pasang protein E dalam 30 rakit berisi tiga pasang, setiap rakit berpusat di sumbu simetri lipat dua. Bentuk setiap protein disederhanakan, dan arah putar pola tulang ikannya tidak dicocokkan dengan koordinat atom.',
        'Kurva demam, hematokrit, dan trombosit mengikuti perjalanan penyakit dalam pedoman WHO untuk satu pasien rekaan. Kurva itu bukan nilai rujukan.',
      ],
    },
    accessed: 'Diakses Oktober 2026.',
  },

  about: {
    title: 'Tentang Pelana',
    description: 'Siapa yang membuat Pelana, untuk apa, dan bagaimana situs ini dibangun.',
    who: {
      h: 'Pembuatnya',
      p: [
        'Pelana dibuat oleh Raffa Gamadan Rifandi, mahasiswa kedokteran Universitas Sriwijaya di Palembang yang juga menulis perangkat lunak.',
        'Situs ini menjelaskan dengue mengikuti cara penyakit itu berjalan, hari demi hari, untuk keluarga yang merawat orang demam dan untuk mahasiswa yang sedang mempelajarinya.',
      ],
    },
    how: {
      h: 'Cara dibangun',
      p: [
        'Tidak ada _en:framework_, pustaka, atau skrip pelacak. _en:Renderer_ WebGL, linimasa gulir, angka mosaik, grafik, dan model wabahnya ditulis khusus untuk proyek ini dengan TypeScript, lalu dikompilasi dengan esbuild menjadi situs statis.',
        'Halaman-halamannya dibuat saat _en:build_ dalam Bahasa Indonesia dan Inggris, sehingga bisa dibaca tanpa JavaScript. Alat-alatnya hanya menyimpan data di peramban, dan setelah kunjungan pertama seluruh situs bisa dipakai tanpa internet.',
      ],
    },
    type: {
      h: 'Huruf',
      p: 'Ditata dengan Plus Jakarta Sans, rancangan Gumpita Rahayu dari Tokotype untuk kota Jakarta, yang dirilis dengan SIL Open Font License.',
    },
    license: {
      h: 'Lisensi',
      p: 'Kode, teks, ilustrasi, dan desain Pelana adalah © 2026 Raffa Gamadan Rifandi, hak cipta dilindungi. Anda boleh membaca kodenya di GitHub, tetapi tidak boleh menyalin, mengubah, menayangkan ulang, atau menyebarkan bagian mana pun tanpa izin tertulis. Hurufnya tetap memakai lisensi terbukanya sendiri.',
    },
    contact: {
      h: 'Kontak',
      p: 'Pertanyaan, koreksi, dan permintaan izin bisa disampaikan lewat GitHub.',
      link: 'github.com/ResVet',
    },
  },

  notFound: {
    title: 'Halaman tidak ditemukan',
    description: 'Halaman ini tidak ada.',
    h: 'Halaman ini sudah dikuras',
    p: 'Mungkin alamatnya salah ketik, atau halamannya sudah pindah.',
    home: 'Kembali ke awal cerita',
  },

  offline: {
    h: 'Anda sedang luring',
    p: 'Halaman ini belum tersimpan di perangkat ini. Buka Pelana sekali saat tersambung ke internet, lalu seluruh situs, termasuk alat-alatnya, bisa dipakai tanpa internet.',
  },
};
