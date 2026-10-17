// Pelana. Copyright (c) 2026 Raffa Gamadan Rifandi. All rights reserved.
//
// English copy. The Indonesian file (id.ts) is typed against this one, so a
// key that exists here and is missing there fails the type check. Inline
// markup: _italic_, [link text](href). Placeholders in braces, like {n}, are
// filled in by fmt().

export const en = {
  lang: 'en',
  locale: 'en-GB',
  dir: 'ltr',

  site: {
    name: 'Pelana',
    tagline: 'Dengue, counted in days',
    description:
      'A story and four free tools about dengue fever: count the fever days, pick the right blood test, check a house for mosquito breeding sites and see how an outbreak spreads.',
    author: 'Raffa Gamadan Rifandi',
    authorRole: 'Medical student, Universitas Sriwijaya',
  },

  nav: {
    skip: 'Skip to content',
    home: 'Pelana home',
    story: 'Story',
    tools: 'Tools',
    sources: 'Sources',
    about: 'About',
    menu: 'Menu',
    close: 'Close',
    feverNow: 'Fever now?',
    settings: 'Settings',
    language: 'Bahasa Indonesia',
    languageShort: 'ID',
    languageLabel: 'Baca dalam Bahasa Indonesia',
    primary: 'Main',
    toolsList: 'Tools',
  },

  tools: {
    tracker: {
      name: 'Count the fever days',
      short: 'Count the days',
      blurb: 'Enter when the fever started. See which phase it is likely in, when the critical days fall on the calendar, and what to watch for.',
    },
    testing: {
      name: 'Which test, which day',
      short: 'Testing',
      blurb: 'NS1, IgM or IgG? Each dengue test works in a different window of the illness. Pick the day of fever to see which ones can help.',
    },
    house: {
      name: 'House check',
      short: 'House check',
      blurb: 'Go through a house room by room and find every place a mosquito can breed, then put a weekly check in your calendar.',
    },
    outbreak: {
      name: 'Outbreak simulator',
      short: 'Outbreak',
      blurb: 'One sick person comes home to a neighbourhood of 1,000. Try draining containers, Wolbachia, vaccination and fogging, and watch what each one changes.',
    },
  },

  settings: {
    title: 'Settings',
    intro: 'These are saved on this device only.',
    theme: { label: 'Colours', system: 'Match device', light: 'Light', dark: 'Dark' },
    text: { label: 'Text size', normal: 'Normal', large: 'Large', larger: 'Larger' },
    contrast: { label: 'Contrast', standard: 'Standard', high: 'High' },
    motion: { label: 'Motion', system: 'Match device', full: 'Full', reduced: 'Reduced' },
    sound: { label: 'Sound', off: 'Off', on: 'On', note: 'Quiet water and tile sounds. Off until you turn it on.' },
    done: 'Done',
  },

  day: {
    before: 'Days before the fever',
    during: 'Day of fever',
    railLabel: 'The days of this story',
    jump: 'Jump to a day',
    labelBefore: '{n} days before the fever',
    labelBeforeOne: '1 day before the fever',
    labelDuring: 'Day {n} of the fever',
    labelAfter: 'After the fever',
    railItem: '{label} {n}',
    beforeShort: 'before',
    duringShort: 'day',
    phases: {
      egg: 'Egg',
      water: 'In the water',
      adult: 'Adult mosquito',
      virus: 'Virus inside her',
      incubation: 'Incubation',
      fever: 'Fever',
      critical: 'Critical days',
      recovery: 'Recovery',
    },
  },

  footer: {
    about:
      'Pelana is a project by Raffa Gamadan Rifandi, a medical student at Universitas Sriwijaya in Palembang. It is for learning and cannot diagnose anyone. If you are worried about someone with a fever, take them to a doctor.',
    emergency: 'Medical emergency in Indonesia: call 119.',
    rights: '© 2026 Raffa Gamadan Rifandi. All rights reserved.',
    license: 'License',
    nav: 'Site links',
    sourceCode: 'Source on GitHub',
    sources: 'Sources',
    updated: 'Facts checked against sources in October 2026.',
  },

  common: {
    illustrative: 'Illustrative values for one imagined patient, not normal ranges.',
    showNumbers: 'Show the numbers',
    learnMore: 'Read more',
    openTool: 'Open',
    print: 'Print',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Share on WhatsApp',
    download: 'Download',
    reset: 'Start again',
    turnLeft: 'Turn left',
    turnRight: 'Turn right',
    yes: 'Yes',
    no: 'No',
    notSure: 'Not sure',
    noScript: 'This part needs JavaScript. Everything else on the page works without it.',
    noWebGL: 'Your browser could not start 3D graphics, so this page shows still pictures instead.',

    warning: {
      title: 'Go to the hospital now if you see any of these',
      items: [
        'Severe belly pain, or pain when the belly is pressed',
        'Vomiting that keeps coming back',
        'Bleeding from the gums or nose, vomiting blood, black stools, or vaginal bleeding outside a period',
        'Unusually sleepy, confused, restless or irritable',
        'Cold, pale, clammy hands and feet',
        'No urine for 4 to 6 hours',
        'Fast or difficult breathing',
        'Very thirsty',
      ],
      action:
        'Any one of these is enough. Go to the nearest emergency department (IGD). In Indonesia you can call 119 for an ambulance.',
    },

    groupB: {
      title: 'See a doctor early, even without warning signs, for',
      items: [
        'babies',
        'pregnant women',
        'older people',
        'people with diabetes, kidney disease, obesity or a long-term blood disorder',
        'anyone who lives alone or far from a clinic without reliable transport',
      ],
      note: 'WHO advises that these patients may need to be watched in hospital as the critical days approach.',
    },

    homeCare: {
      title: 'At home, during the fever',
      items: [
        'Rest, and drink often: oral rehydration solution (oralit), fruit juice, soup, anything with salt and sugar in it.',
        'For fever and aches, use paracetamol as the pack directs, with at least six hours between doses.',
        'Do not take ibuprofen, aspirin or other anti-inflammatory painkillers. They can make bleeding worse.',
        'Make sure the sick person passes urine at least once every six hours.',
      ],
    },
  },

  home: {
    title: 'Pelana: dengue, counted in days',
    description:
      'Dengue is counted in days. Follow one case from a mosquito egg on a bathroom tile to the critical days after the fever breaks, and learn the warning signs that send someone to hospital.',

    hero: {
      title: 'Dengue is counted in days.',
      lede:
        'This one starts thirty days before the fever, on the tiled wall of a _id:bak mandi_, the water tank found in most Indonesian bathrooms, a few millimetres above the water.',
      scroll: 'Scroll to move the days forward',
      skip: 'Someone has a fever now? Count their days',
    },

    beats: {
      eggs: {
        h: 'Her eggs go on the wall, just above the waterline',
        p: [
          'An _Aedes aegypti_ female sticks her eggs to the inside of a container one at a time, a little above the water. They are black and tiny, easy to mistake for dirt.',
          'Dry, they can wait for up to eight months. They hatch when water covers them, which in a _id:bak mandi_ happens whenever someone fills it to the brim.',
        ],
      },
      hatch: {
        h: 'The tub is filled, and the eggs hatch',
        p: [
          'The larvae are called _id:jentik_ in Indonesian and wigglers in English, for the way they move. They hang from the surface, breathing through a short tube at the tail, and dive when something moves above them.',
        ],
      },
      week: {
        h: 'Seven to ten days',
        p: [
          'Larva, then pupa, then mosquito. From egg to adult takes seven to ten days, which is why the advice is to clean water containers once a week.',
          'Draining alone is not enough. The eggs stay glued to the tile and hatch the next time the tub is filled, so the walls need a scrub with a brush as well.',
        ],
        drain: 'Drain and scrub the tub',
        drained:
          'In your bathroom the story would stop here. In this one, nobody cleaned the tub that week.',
        refill: 'Carry on with the story',
      },
      adult: {
        h: 'She is small, black and striped',
        p: [
          'The adult splits the pupal skin at the surface and stands on the water while her wings harden.',
          'You can recognise _Aedes aegypti_ by the white bands on her black legs and a silvery mark shaped like a lyre on her back. Only females bite. They need the protein in blood to make eggs.',
        ],
        look: 'Look closer at',
        parts: {
          lyre: {
            label: 'The lyre',
            note: 'Silver-white scales on the thorax in the shape of a lyre. It is the quickest way to tell this species apart.',
          },
          legs: {
            label: 'The legs',
            note: 'Black, with white bands at the joints of each leg.',
          },
          proboscis: {
            label: 'The proboscis',
            note: 'The long mouthpart. A female uses it to pierce skin and draw blood, and passes saliva in as she feeds.',
          },
          wings: {
            label: 'The wings',
            note: 'Narrow and folded flat over the body at rest. They beat hundreds of times a second, which is the whine you hear near your ear.',
          },
        },
        rotate: 'Drag to turn her around',
      },
      habits: {
        h: 'She bites in daylight, close to home',
        p: [
          '_Aedes aegypti_ is active during the day and at dusk, prefers people to animals and comes indoors without hesitation.',
          'She does not travel far: her flight range is estimated at about 200 metres. The mosquito that bites you probably grew up in water within a few houses of yours.',
        ],
      },
      neighbour: {
        h: 'She bites a neighbour who has dengue',
        p: [
          'He is in the first days of a fever and the virus is in his blood. People can pass dengue to mosquitoes from about two days before their symptoms start until about two days after the fever ends.',
          'She takes the virus in with the blood.',
        ],
      },
      inside: {
        h: 'Eight to twelve days inside her',
        p: [
          'The virus multiplies in her gut and spreads through her body until it reaches her salivary glands. At 25 to 28 °C this takes about eight to twelve days, and less in hotter weather. Once that is done, she can pass the virus on for the rest of her life.',
        ],
      },
      virion: {
        h: 'What the virus looks like',
        p: [
          'A dengue virus particle is about 50 nanometres across, roughly a thousand times thinner than a hair.',
          'Its outer shell is 180 copies of one protein, called E, lying flat against the surface in 90 pairs. Three pairs side by side make a raft, and 30 rafts tile the whole particle in a herringbone pattern. Under the shell is a fatty membrane. Inside that is the genome, a single strand of RNA about 11,000 bases long.',
          'There are four types of dengue virus, DENV-1 to DENV-4. Having had one type does not stop you catching the others, and a second infection is more likely to be severe.',
        ],
        explode: 'Take the particle apart',
        layers: ['Whole particle', 'Shell of E protein', 'Membrane', 'Core and RNA'],
        domains: 'Each E protein has three parts, coloured here as they are in research papers: domain I (red), domain II (yellow) with the fusion loop at its tip, and domain III (blue).',
        rotate: 'Drag to turn it',
        model: 'Built in code from the published layout: 30 rafts on the faces of a rhombic triacontahedron, one raft over each two-fold symmetry axis.',
      },
      you: {
        h: 'Then she bites you',
        p: [
          'For four to ten days nothing seems to happen, while the virus multiplies inside you.',
          'Most dengue infections stay mild or cause no symptoms at all. This story follows one that does not stay mild.',
        ],
      },
      fever: {
        h: 'The fever comes on suddenly',
        p: [
          'It often reaches 40 °C. A severe headache, pain behind the eyes, aching muscles and joints, nausea and a rash are common. This first phase usually lasts two to seven days.',
        ],
      },
      breaks: {
        big: 'Then the fever breaks.',
        h: 'Days 3 to 7: the critical phase',
        p: [
          'It feels like the end of the illness. In dengue, the most dangerous part starts here.',
          'Somewhere between day 3 and day 7 the temperature drops to 37.5–38 °C or lower and stays there. For the next 24 to 48 hours the smallest blood vessels become leaky. Plasma, the pale yellow liquid part of blood, seeps out into the tissues while the red cells stay inside, so the blood that is left grows thicker.',
          'If enough plasma escapes, blood pressure falls and the organs stop getting enough blood. That is dengue shock.',
        ],
      },
      platelets: {
        h: 'Everyone asks about the platelets',
        p: [
          'At an Indonesian bedside the first question is usually “_id:trombositnya berapa?_”, how many platelets? The count does fall in dengue, and very low platelets raise the risk of bleeding.',
          'Shock comes from the leak, though, and the leak shows in a different number: the haematocrit, the share of the blood made up of red cells. A haematocrit that climbs while the platelets drop quickly is one of the warning signs doctors watch for. A rise of 20% or more above the person’s usual value is one of the standard signs of plasma leakage.',
        ],
        slip: 'Lab results',
        slipRows: { hct: 'Haematocrit', plt: 'Platelets', wbc: 'White cells' },
        slipDay: 'Day {n}',
      },
      warning: {
        h: 'The signs that cannot wait',
        p: ['These come from the WHO dengue guidelines, written in plain words.'],
        cta: 'Count the days for someone with a fever',
      },
      recovery: {
        h: 'Day 7 onwards: the fluid comes back',
        p: [
          'If the leak stops in time, the body draws the escaped fluid back into the blood over the next two to three days. Appetite returns and the person passes more urine.',
          'Some people get an itchy rash that doctors describe as “isles of white in the sea of red”, and the heart can beat slowly for a while.',
          'Recovery has its own risk in hospital. The fluid that leaked out comes back into the vessels, so doctors turn the drip down to keep it from flooding the lungs.',
        ],
      },
      saddle: {
        h: 'Why it is called the saddle',
        p: [
          'In Indonesia this course of illness is called _id:siklus pelana kuda_, the horse-saddle cycle. The fever rises, falls and in some people climbs a little again before it settles, so the curve looks like a saddle.',
          'Not everyone gets the second rise. Everyone goes through the dip, and the dip is the part to watch.',
        ],
        chart: {
          title: 'One imagined patient, day by day',
          temp: 'Temperature',
          hct: 'Haematocrit',
          plt: 'Platelets',
          critical: 'Critical days',
          day: 'Day',
        },
      },
      again: {
        h: 'The count starts again in the tub',
        p: [
          'The mosquitoes are still breeding after the fever is gone, and a second dengue infection is more likely to be severe than the first.',
        ],
      },
    },

    prevention: {
      h: 'What actually stops it',
      psn: {
        h: '3M Plus, once a week',
        p: [
          'Indonesia’s household programme is called PSN 3M Plus. The three Ms are _id:menguras_ (drain and scrub water containers), _id:menutup_ (cover stored water tightly) and _id:mendaur ulang_ (reuse or recycle anything that can collect rain). The Plus covers the rest: larvicide powder (_id:abate_) for containers that cannot be drained, fish that eat larvae, repellent and bed nets.',
          'WHO gives the same advice: cover, empty and clean water containers every week. The national campaign asks each household to choose one person, the _id:Jumantik_, to check the house for larvae.',
        ],
        cta: 'Check a house',
      },
      wolbachia: {
        h: 'Mosquitoes that carry Wolbachia',
        p: [
          '_Wolbachia_ is a bacterium that makes it harder for _Aedes aegypti_ to pass dengue on. In a randomised trial in Yogyakarta, the risk of dengue in neighbourhoods where these mosquitoes were released was 77% lower than in neighbourhoods without them, and the risk of being admitted to hospital with dengue was 86% lower.',
          'The Ministry of Health has since started releases in parts of Jakarta Barat, Bandung, Semarang, Bontang and Kupang.',
        ],
        cta: 'Run an outbreak',
      },
      vaccine: {
        h: 'A vaccine',
        p: [
          'Indonesia approved the Qdenga vaccine (TAK-003) in August 2022 for people aged 6 to 45, given as two doses three months apart. In its main trial it prevented 80% of dengue cases in the first year. Over four and a half years it prevented 61% of cases and 84% of hospital admissions.',
          'In trial volunteers who had never had dengue, it did not show protection against type 3, and there were too few type 4 cases to tell. WHO currently recommends it for children aged 6 to 16 where dengue spreads a lot. A doctor can say whether it suits you.',
        ],
      },
    },

    toolsSection: {
      h: 'Four tools',
      p: 'After your first visit they work without a connection, and nothing you type leaves your device.',
    },
  },

  tracker: {
    title: 'Count the fever days',
    description:
      'Enter when a dengue fever started and see the day of illness, the likely phase, the dates of the critical days and the warning signs to watch for.',
    lede: 'Enter when the fever started. Pelana works out which day of illness it is and when the critical days fall, so you know when to watch most closely.',
    disclaimer:
      'This page counts days. It cannot tell whether someone has dengue or how sick they are. Only a doctor and a blood test can.',
    form: {
      legend: 'When did the fever start?',
      name: 'Name (optional)',
      namePlaceholder: 'For example: Adik',
      nameHint: 'Useful if you are looking after more than one person.',
      date: 'Date',
      time: 'Roughly what time',
      times: {
        morning: 'Morning (6 am to noon)',
        afternoon: 'Afternoon (noon to 6 pm)',
        evening: 'Evening (6 pm to midnight)',
        night: 'Night (midnight to 6 am)',
      },
      submit: 'Count the days',
      future: 'That date is in the future. Pick the day the fever started.',
      tooOld: 'That was more than three weeks ago. The day count is only useful during the first two weeks of illness.',
      missing: 'Pick the date the fever started.',
    },
    result: {
      heading: 'Day {n} of fever',
      headingNamed: '{name}: day {n} of fever',
      since: 'Counting from {date}. Day 1 is the first 24 hours of fever.',
      phases: {
        early: {
          h: 'Fever phase',
          p: 'The temperature is usually high now. Keep the person drinking and resting. The critical days usually begin between day 3 and day 7, often as the fever comes down.',
        },
        critical: {
          h: 'Critical days',
          p: 'This is when plasma can leak, often just as the fever drops. A falling temperature is not a sign that the danger is over. Check for the warning signs several times a day and keep the person drinking.',
        },
        late: {
          h: 'Probably past the critical days',
          p: 'Most people are past the critical phase by now, especially if there have been no warning signs. Appetite usually returns. Keep watching for the warning signs until the person feels well, and see a doctor if anything gets worse.',
        },
        over: {
          h: 'More than two weeks',
          p: 'The day count is no longer useful at this point. If the person is still unwell, they need to see a doctor.',
        },
      },
      window: 'Watch most closely from {start} to {end}.',
      windowPast: 'The usual critical days were {start} to {end}.',
      calendarLabel: 'The first ten days',
      today: 'Today',
    },
    usual: {
      h: 'How the days usually go',
      early: 'Days 1 to 3',
      critical: 'Days 3 to 7',
      late: 'After day 7',
    },
    log: {
      h: 'Notes for the doctor',
      p: 'Write down temperatures and how much the person drinks and passes urine. Doctors find this useful, and it helps you notice changes.',
      temp: 'Temperature (°C)',
      tempPlaceholder: '38.5',
      when: 'Time',
      drank: 'Drank since last note',
      drankOptions: { none: 'Not noted', little: 'Very little', some: 'Some', plenty: 'Plenty' },
      urine: 'Passed urine in the last 6 hours',
      note: 'Anything else',
      add: 'Add note',
      empty: 'No notes yet.',
      remove: 'Remove',
      added: 'Note added.',
      removed: 'Note removed.',
      chartTitle: 'Temperature readings',
      invalidTemp: 'Enter a temperature between 34 and 43 °C.',
    },
    export: {
      h: 'Keep it with you',
      calendar: 'Add the critical days to my calendar',
      calendarHint: 'A calendar file with three reminders a day, from day 3 to day 7, to check for the warning signs.',
      copy: 'Copy a summary for the doctor',
      whatsapp: 'Send the summary on WhatsApp',
      print: 'Print',
      summaryTitle: 'Fever summary',
      summaryStart: 'Fever started: {date}',
      summaryDay: 'Today is day {n} of fever.',
      summaryNotes: 'Notes:',
      eventTitle: 'Dengue check: day {n} of fever',
      eventBody: 'Check for warning signs: severe belly pain, repeated vomiting, bleeding, strong thirst, unusual sleepiness or restlessness, cold clammy hands and feet, no urine for 4 to 6 hours, fast breathing. If any appear, go to the IGD now or call 119.',
    },
    privacy: {
      h: 'Your data',
      p: 'Everything you enter stays in this browser on this device. Nothing is sent anywhere.',
      clear: 'Delete everything',
      confirm: 'Delete all names, dates and notes saved on this device?',
      cleared: 'Deleted.',
    },
    people: { label: 'Person', add: 'Someone else', untitled: 'Unnamed' },
  },

  testing: {
    title: 'Which dengue test, on which day',
    description:
      'NS1, PCR, IgM or IgG: which dengue blood test helps on which day of fever, and how a second infection changes the results.',
    lede: 'Dengue tests look for different things, and each one works in a different window of the illness. Pick the day of fever to see which tests are likely to help.',
    controls: {
      day: 'Day of fever',
      dayValue: 'Day {n}',
      before: 'Has this person had dengue before?',
      beforeOptions: { no: 'No', yes: 'Yes', unknown: 'Not sure' },
      fromTracker: 'Using the day from Count the days',
    },
    chart: {
      title: 'When each test can find dengue',
      day: 'Day of illness',
      strong: 'Usually positive',
      weak: 'Sometimes positive',
      today: 'Selected day',
    },
    tests: {
      pcr: { name: 'PCR', full: 'RT-PCR (virus genetic material)' },
      ns1: { name: 'NS1', full: 'NS1 antigen (a virus protein)' },
      igm: { name: 'IgM', full: 'IgM antibodies (early immune response)' },
      igg: { name: 'IgG', full: 'IgG antibodies (later or past immune response)' },
      cbc: { name: 'Blood count', full: 'Full blood count (platelets and haematocrit)' },
    },
    advice: {
      early: {
        h: 'Days 1 to 3: look for the virus itself',
        p: 'NS1 or PCR can find the virus in the blood from the first day. IgM is often still negative this early, so a negative IgM does not rule dengue out.',
      },
      middle: {
        h: 'Days 4 to 7: two tests together',
        p: 'NS1 and IgM together catch most cases. A negative NS1 does not rule dengue out, especially later in this window or in a second infection.',
      },
      late: {
        h: 'After day 7: antibodies',
        p: 'IgM is the main test now, and it stays positive for about three months. NS1 and PCR are often negative by this point.',
      },
      secondary:
        'In a second infection, IgG rises early and high, IgM can stay low, and NS1 tests miss more cases.',
      igg: 'IgG on its own cannot confirm dengue now. It stays positive for years after an earlier infection.',
      cbc: 'Whatever the result, doctors repeat the full blood count through the critical days to follow the platelets and the haematocrit.',
      crossReact:
        'Antibody tests can also react to related viruses such as Zika, so the doctor reads them alongside the symptoms.',
    },
    note: 'The bars show typical windows from CDC and WHO guidance. Individual tests and people vary.',
  },

  house: {
    title: 'Check a house for mosquito breeding sites',
    description:
      'Go through an Indonesian house room by room and find the places where Aedes aegypti breeds, with what to do about each one and a weekly reminder for your calendar.',
    lede: '_Aedes aegypti_ breeds in containers that hold water, most of them in and around the house. Tap each spot to check it.',
    progress: '{n} of {total} spots dealt with',
    done: 'Every spot is dealt with. Do it again next week: an egg needs only seven to ten days to become a mosquito.',
    actions: {
      drain: 'Drain and scrub',
      cover: 'Cover',
      recycle: 'Recycle or remove',
      plus: 'Plus',
    },
    mark: 'Mark as done',
    unmark: 'Not done yet',
    rooms: { bathroom: 'Bathroom', kitchen: 'Kitchen', living: 'Living room', yard: 'Yard', roof: 'Roof' },
    spots: {
      tub: { name: 'Bak mandi', action: 'drain', text: 'Drain it and scrub the walls with a brush once a week. Eggs stay stuck to the tile after the water is gone.' },
      bucket: { name: 'Bucket or water drum', action: 'cover', text: 'Keep a tight lid on it. If it cannot be covered, empty and scrub it every week.' },
      dispenser: { name: 'Water dispenser tray', action: 'drain', text: 'Empty and wipe the drip tray every few days.' },
      fridge: { name: 'Fridge drip tray', action: 'drain', text: 'Pull the fridge out and empty the tray at the back.' },
      vase: { name: 'Flower vase', action: 'drain', text: 'Change the water and scrub the vase at least once a week.' },
      saucer: { name: 'Plant pot saucer', action: 'drain', text: 'Empty the saucer, or fill it with sand so water cannot pool.' },
      anttrap: { name: 'Ant traps under the cupboard', action: 'drain', text: 'Empty and refill the dishes under the cupboard legs every week.' },
      birdbath: { name: 'Bird’s drinking dish', action: 'drain', text: 'Change the water and rinse the dish every week.' },
      tyre: { name: 'Old tyres', action: 'recycle', text: 'Get rid of them, keep them under a roof, or drill holes so they cannot hold rain.' },
      litter: { name: 'Cans, bottles and cups', action: 'recycle', text: 'Throw them away or recycle them. Even a little rainwater caught in them is enough for larvae.' },
      gutter: { name: 'Roof gutter', action: 'drain', text: 'Clear the leaves so rainwater can drain away.' },
      tank: { name: 'Water tank on the roof', action: 'cover', text: 'Keep the lid shut tight so mosquitoes cannot get in to lay eggs.' },
      pond: { name: 'Pond or water feature', action: 'plus', text: 'Keep fish that eat larvae, such as guppies.' },
    },
    reminder: {
      h: 'A weekly check in your calendar',
      p: 'Pick a day and a time. Pelana makes a calendar file that repeats every week with this checklist inside.',
      day: 'Day',
      time: 'Time',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      button: 'Download the weekly reminder',
      eventTitle: 'Weekly mosquito check (PSN 3M Plus)',
    },
    print: 'Print the checklist',
    listHeading: 'All spots',
    reset: 'Clear the checks',
    viewHint: 'Drag to look around the house',
  },

  outbreak: {
    title: 'Dengue outbreak simulator',
    description:
      'A teaching model of dengue in a neighbourhood of 1,000 people. Change breeding sites, Wolbachia, vaccination and fogging and see how the outbreak changes.',
    lede: 'A neighbourhood of 1,000 people, its mosquitoes, and one person who comes home with dengue. Change what the neighbourhood does, then run the next eight months.',
    controls: {
      h: 'What the neighbourhood does',
      breeding: 'Breeding sites removed',
      breedingHint: 'Containers drained, covered or thrown away (PSN 3M Plus)',
      wolbachia: 'Mosquitoes carrying Wolbachia',
      wolbachiaHint: 'Share of local Aedes aegypti with the wMel strain',
      vaccine: 'People vaccinated',
      vaccineHint: 'Two doses, before the outbreak starts',
      season: 'Season',
      seasons: { rainy: 'Rainy', dry: 'Dry' },
      fog: 'Fog the neighbourhood',
      fogHint: 'Kills flying mosquitoes for a few days. Larvae in the water survive.',
      fogged: 'Fogged on day {n}',
      reset: 'Reset',
      presets: 'Try',
      presetList: {
        nothing: 'Do nothing',
        fog: 'Fogging only',
        psn: 'Clean every week',
        wolbachia: 'Wolbachia',
        all: 'Everything together',
      },
    },
    results: {
      h: 'The outbreak with your choices',
      infected: 'People infected',
      peak: 'Busiest week',
      peakValue: 'Week {n}',
      r0: 'Reproduction number at the start',
      r0Hint: 'How many people the first case infects through mosquitoes. Above 1, the outbreak grows.',
      none: 'No outbreak',
      chartCases: 'New infections per week',
      chartMosquitoes: 'Adult mosquitoes',
      baseline: 'With no action',
      current: 'With your choices',
      week: 'Week',
    },
    city: {
      label: 'Each tile is one person',
      susceptible: 'Can be infected',
      exposed: 'Infected, not yet sick',
      infectious: 'Sick and infectious',
      recovered: 'Recovered',
      protected: 'Protected by vaccine',
      play: 'Play',
      pause: 'Pause',
      day: 'Day {n}',
      scrub: 'Day shown',
      counts: 'Day {n}: {s} can be infected, {e} infected but not yet sick, {i} sick, {r} recovered, {p} protected by vaccine.',
    },
    model: {
      h: 'What is inside the model',
      p: [
        'People move between four states: susceptible, exposed (infected but not yet infectious), infectious and recovered. Mosquitoes have an aquatic stage and three adult states: susceptible, exposed while the virus incubates, and infectious for life. The two populations infect each other through bites. This is the standard host and vector structure used in dengue models.',
        'The equations are solved in a background thread with the fourth-order Runge–Kutta method, half a day per step.',
      ],
      table: { parameter: 'Parameter', value: 'Value', source: 'Source' },
      params: {
        biting: 'Bites per mosquito per day',
        bh: 'Chance a bite infects a person',
        bv: 'Chance a bite infects a mosquito',
        eip: 'Incubation in the mosquito',
        iip: 'Incubation in a person',
        infectious: 'Infectious period in a person',
        lifespan: 'Adult mosquito lifespan',
        development: 'Egg to adult',
        wolbachia: 'Cut in R when every mosquito carries wMel',
        vaccine: 'Vaccine protection, assumed here to block infection',
        fog: 'Fogging',
        density: 'Adult mosquitoes per person, rainy season',
        dry: 'Breeding capacity in the dry season',
      },
      units: { day: 'days', perDay: 'per day' },
      chosen: 'Chosen for this model',
      vaccineSource: 'Biswal 2019: {pct} against dengue with symptoms in the first year',
      fogValue: '70% of flying adults killed per day, for 3 days',
      dryValue: '45% of the rainy season',
      equations: 'Show the equations',
      limits:
        'This is a model for building intuition. It assumes nobody in the neighbourhood is immune at the start, and it leaves out people travelling between neighbourhoods, the four virus types and rainfall from week to week. Its numbers are not a forecast for any real place.',
    },
  },

  sources: {
    title: 'Sources',
    description: 'The guidelines, studies and data behind Pelana, and how each picture and model was made.',
    lede: 'Every number on this site comes from one of these. If you find a mistake, please report it on GitHub.',
    groups: {
      clinical: 'Illness and care',
      testing: 'Testing',
      mosquito: 'The mosquito',
      virus: 'The virus',
      prevention: 'Prevention',
      model: 'The outbreak model',
      local: 'Indonesia',
    },
    method: {
      h: 'How the pictures were made',
      items: [
        'Nothing on this site is a photograph or a downloaded 3D model. The bathroom, the mosquito, the virus and the house are generated in code each time the page loads and drawn with WebGL.',
        'The virus particle follows the cryo-electron microscopy layout of mature dengue virus: 90 pairs of E protein in 30 rafts of three, each raft centred on a two-fold symmetry axis. The shape of each protein is simplified, and the handedness of the herringbone was not checked against atomic coordinates.',
        'The fever, haematocrit and platelet curves follow the course described in the WHO guidelines for one imagined patient. They are not reference ranges.',
      ],
    },
    accessed: 'Accessed October 2026.',
  },

  about: {
    title: 'About Pelana',
    description: 'Who made Pelana, why, and how it is built.',
    who: {
      h: 'Who made it',
      p: [
        'Pelana is by Raffa Gamadan Rifandi, a medical student at Universitas Sriwijaya in Palembang who also writes software.',
        'It explains dengue the way the illness unfolds, one day at a time, for families looking after someone with a fever and for students learning the disease.',
      ],
    },
    how: {
      h: 'How it is built',
      p: [
        'There are no frameworks, libraries or tracking scripts. The WebGL renderer, the scroll timeline, the mosaic numbers, the charts and the outbreak model are all written for this project in TypeScript and compiled with esbuild into a static site.',
        'The pages are generated at build time in Indonesian and English, so they can be read without JavaScript. The tools save to the browser only, and after the first visit the whole site works offline.',
      ],
    },
    type: {
      h: 'Type',
      p: 'Set in Plus Jakarta Sans, designed by Gumpita Rahayu of Tokotype for the city of Jakarta and released under the SIL Open Font License.',
    },
    license: {
      h: 'License',
      p: 'The code, text, illustrations and design of Pelana are © 2026 Raffa Gamadan Rifandi, all rights reserved. You may read the source on GitHub, but you may not copy, modify, host or redistribute any part of it without written permission. The typeface keeps its own open license.',
    },
    contact: {
      h: 'Contact',
      p: 'Questions, corrections and requests for permission go through GitHub.',
      link: 'github.com/ResVet',
    },
  },

  notFound: {
    title: 'Page not found',
    description: 'This page does not exist.',
    h: 'This page drained away',
    p: 'The address may be mistyped, or the page may have moved.',
    home: 'Go to the start of the story',
  },

  offline: {
    h: 'You are offline',
    p: 'This page is not saved on this device yet. Open Pelana once with a connection and the whole site, tools included, will work without one.',
  },
};

export type Copy = typeof en;
