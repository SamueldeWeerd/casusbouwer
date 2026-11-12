// Inhoud van de rondes: drie subsystemen, dan een eindronde met gevoelige data waarin alles samenkomt.
// focus: de zone die groot bovenaan het bord staat, met een schets; arrows: teksten bij de pijlen.
// Het bord nest de zones: vm (als die er is) om harness (als die er is) om agent. model staat los daarbuiten.
// story/task/facts: de casusbeschrijving links (de casus, de opdracht, goed om te weten).
// Scores per blok: v = veiligheid, s = eenvoud (makkelijk werken, weinig op de agent letten), elk 1–5. Totaal = 1,5 × v + s.
// from: id van een eerdere ronde waar dit blok vandaan komt ("Nieuw sinds ronde N").
// selfEval: groepjes beoordelen hun opstelling zelf.
// carry: [[ronde-id, vak-id], …] vult een leeg vak met de keuze uit een eerdere ronde, als dat blok hier bestaat.
// Regels krijgen (s): s[vak] = gekozen blok-id.
// Een regel geeft { type, text, cap: {v: n}, adj: {v,s}, ignoreMin: [vak] }, een lijst daarvan, of null.
// type: "risk" (risico), "insight" (inzicht), "good" (sterk punt).

// Eindronde: draait de agent op de laptop zelf?
const onLaptop = (s) => ["laptop", "laptop-sandbox"].includes(s.loc);
const inVm = (s) => ["local-vm", "remote-vm"].includes(s.loc);
// Ronde 1: werkt de inlog van de ontwikkelaar ook voor de agent? Op de laptop en in een gewone devcontainer wel,
// in de VM en in een dichtgezette devcontainer niet.
const devLogin = (s) => !["remote-vm", "dc-closed"].includes(s.loc);
// Ronde 1: een sandbox, met of zonder eigen profiel.
const sbx = (s) => ["h-sandbox", "h-profile", "h-autoreview"].includes(s.perm);
// Ronde 1: harnassen waar niemand (of het model zelf) een push tegenhoudt.
const noAsk = (s) => ["h-yolo", "h-allow", "h-autosafe"].includes(s.perm);
// Waar staat de agent in ronde 1, als hij niet bij de laptop kan?
const awayName = (s) => (s.loc === "remote-vm" ? "de VM" : "de dichtgezette devcontainer");
// Beide Qwen-opties zijn hetzelfde Chinese model (Alibaba): op de servers van Rijkswaterstaat, of kleiner op je laptop.
const isQwen = (m) => ["qwen-werk", "local-model"].includes(m);
const sandboxHarness = (h) => ["h-codex", "h-codex-profile", "h-codex-home", "h-codex-auto", "h-qwencode", "h-claude", "h-openhands"].includes(h);
const qwenNews = "Qwen is een Chinees model. In onderzoek van Cohere (oktober 2026) probeerde Qwen 3.8 ongevraagd iets te uploaden naar een server van Alibaba in Beijing; de sandbox hield het tegen.";

window.CASES = [
  // ───────────────────────────── RONDE 1 ─────────────────────────────
  {
    id: "r1",
    nr: 1,
    label: "Ronde 1",
    title: "GitLab",
    selfEval: true,
    focus: "gitlab",
    story: [
      "Jullie team bouwt een dashboard, in een repository in GitLab. Daarop staan tickets (issues): bugs, features die moeten worden toegevoegd, en een refactoring.",
      "Er zitten geen persoonsgegevens en geen gevoelige data in.",
      "Jullie werken die tickets weg samen met een AI-agent. De agent pakt een issue op, schrijft de fix op een eigen branch en draait de tests. De ontwikkelaar kijkt mee en beslist.",
    ],
    task: "Hoe werken de agent en de ontwikkelaar samen met GitLab? Kies waar de agent draait, met welke inlog hij bij GitLab komt, hoe het harnas om toestemming vraagt, welk model hij gebruikt, wie er pullt en pusht, wie de MR merget, en wat er draait als er gepusht wordt.",
    facts: [
      "Standaard werkt de agent in de terminal van de ontwikkelaar, op diens laptop: hij schrijft code en draait commando's. Een VM van Rijkswaterstaat of een devcontainer kan ook.",
      "Een devcontainer of een sandboxprofiel kun je opzetten samen met GPT-6.1 in Codex.",
      "Automatisch goedkeuren kan op twee manieren: het model beslist zelf wat veilig is (Cline), of een aparte reviewer-agent beslist (Codex, alleen met een model van OpenAI).",
      "Het model: Codex Enterprise van OpenAI (in de cloud) is het slimst en het snelst. Qwen op de servers van Rijkswaterstaat is minder slim en alleen bereikbaar op het netwerk van Rijkswaterstaat, dus niet thuis. Qwen is een Chinees model.",
      "Het harnas is het programma om het model heen. Het voert de commando's uit en kan om toestemming vragen.",
      "Een push start automatisch de pipeline. Er is één runner, voor alle branches, met internet.",
    ],
    zones: {
      gitlab: "GitLab",
      vm: "VM",
      harness: "Harnas",
      agent: "De agent",
      mens: "De ontwikkelaar",
      model: "Modellen",
    },
    zoneNotes: {
      vm: "Een extra laag om het harnas heen. Of toch gewoon de laptop.",
      harness: "Het programma om het model heen: voert de commando's uit en vraagt om toestemming.",
      agent: "Leest issues, schrijft code en draait de tests.",
      mens: "Geeft de opdracht, kijkt mee en beslist.",
      model: "Krijgt alles wat het harnas leest, en bedenkt wat er moet gebeuren.",
    },
    arrows: { agent: "issues, MR's, pull en push", mens: "pull, push en review", between: "opdracht en toestemming", model: "alles wat de agent leest" },
    slots: [
      { id: "loc", zone: "vm", label: "Waar draait de agent?" },
      { id: "perm", zone: "harness", label: "Hoe vraagt het harnas om toestemming?" },
      { id: "auth", zone: "agent", label: "Met welke inlog komt de agent bij GitLab?" },
      { id: "model", zone: "model", label: "Welk model?" },
      { id: "devtok", zone: "mens", label: "Waar staat het GitLab-token van de ontwikkelaar zelf?" },
      { id: "git", zone: "mens", label: "Wie pullt en pusht?" },
      { id: "merge", zone: "mens", label: "Wie merget de MR?" },
      { id: "ci", zone: "gitlab", label: "Wat draait er als er gepusht wordt? (testen, linting, image bouwen)" },
    ],
    blocks: [
      // loc
      { id: "laptop", slot: "loc", title: "Op de laptop, in de terminal van de ontwikkelaar", desc: "Alles staat klaar: de repo, de tests.", detail: "", v: 3, s: 5 },
      { id: "remote-vm", slot: "loc", title: "In een VM van Rijkswaterstaat", desc: "De agent draait er als eigen gebruiker, met alleen de repo.", detail: "Kost geld per maand. Bereikt ook thuis Qwen op de servers van Rijkswaterstaat.", v: 5, s: 3.5 },
      { id: "devcontainer", slot: "loc", title: "Devcontainer in VS Code", desc: "Eén klik, en je git-inlog werkt meteen.", detail: "Draait op de laptop, met alleen de projectmap.", v: 3, s: 4.5 },
      { id: "dc-closed", slot: "loc", title: "Devcontainer, dichtgezet (opgezet samen met GPT-6.1)", desc: "Zonder je git-inlog, alleen de projectmap, netwerk alleen naar GitLab en het model.", detail: "Eén keer goed opzetten. Draait op de laptop.", v: 4, s: 4 },
      // auth
      { id: "a-pat", slot: "auth", title: "Het token van de ontwikkelaar", desc: "Zijn persoonlijke token, met al zijn rechten.", detail: "Werkt meteen.", v: 2, s: 5 },
      { id: "a-credman", slot: "auth", title: "Een credential manager", desc: "Het token van de ontwikkelaar, in de keychain in plaats van in een bestand.", detail: "", v: 3, s: 4.5 },
      { id: "a-bot", slot: "auth", title: "Een eigen token voor de agent", desc: "Alleen deze repo, alleen pullen, naar een branch pushen en een MR openen. Verloopt vanzelf.", detail: "", v: 4, s: 3.5 },
      { id: "a-none", slot: "auth", title: "Geen inlog", desc: "De agent komt niet bij GitLab. De ontwikkelaar plakt het issue en maakt de MR.", detail: "", v: 5, s: 3 },
      // perm
      { id: "h-yolo", slot: "perm", title: "Alles mag, hij vraagt niets", desc: "Geen sandbox en geen vragen.", detail: "", v: 1, s: 5 },
      { id: "h-askall", slot: "perm", title: "Hij vraagt bij elk commando", desc: "De ontwikkelaar keurt elk commando goed.", detail: "Geen sandbox.", v: 4, s: 1 },
      { id: "h-allow", slot: "perm", title: "Alleen git push vraagt toestemming", desc: "Een regel in het harnas: voor ‘git push’ vraagt hij, de rest mag.", detail: "", v: 2, s: 4.5 },
      { id: "h-sandbox", slot: "perm", title: "Sandbox: hij vraagt alleen als hij eruit wil", desc: "Werken in de repo mag, zonder netwerk. Voor alles daarbuiten, ook git, vraagt hij.", detail: "", v: 4, s: 3.5 },
      { id: "h-profile", slot: "perm", title: "Sandbox met een eigen profiel (opgesteld samen met GPT-6.1)", desc: "Als de sandbox, plus een profiel dat de bekende plekken met sleutels en tokens afschermt.", detail: "Eén keer goed opstellen.", v: 4.5, s: 4 },
      { id: "h-autosafe", slot: "perm", title: "Automatisch goedkeuren: het model beslist zelf wat veilig is", desc: "Geen sandbox. Het model bepaalt zelf welke commando's veilig zijn, en vraagt alleen bij de rest.", detail: "Zoals ‘Execute safe commands’ in Cline.", v: 2, s: 5 },
      { id: "h-autoreview", slot: "perm", title: "Sandbox met auto-review: een aparte reviewer beslist als hij eruit wil", desc: "Als de sandbox, maar een aparte reviewer-agent keurt goed in plaats van de ontwikkelaar.", detail: "Codex: ‘Approve for me’. Werkt alleen met een model van OpenAI.", v: 3.5, s: 4.5 },
      // git
      { id: "g-agent", slot: "git", title: "De agent pullt, commit en pusht", desc: "Hij doet alles in git zelf.", detail: "", v: 2, s: 5 },
      { id: "g-pull", slot: "git", title: "De agent pullt en commit, de ontwikkelaar pusht", desc: "Pas bij een push gaat er iets naar GitLab.", detail: "", v: 4, s: 4 },
      { id: "g-dev", slot: "git", title: "Alleen de ontwikkelaar pullt en pusht", desc: "De agent werkt alleen in de bestanden.", detail: "", v: 5, s: 3.5 },
      { id: "m-dev", slot: "merge", title: "De ontwikkelaar checkt de diff en merget", desc: "Hij leest de MR in GitLab voordat die op main komt.", detail: "Eén keer per MR.", v: 4, s: 4 },
      { id: "m-agent", slot: "merge", title: "De agent merget zelf", desc: "Als de pipeline groen is, merget de agent zijn eigen MR.", detail: "", v: 1, s: 5 },
      // ci
      { id: "ci-open", slot: "ci", title: "De pipeline, op een runner met internet", desc: "Elke push start de pipeline, met internet.", detail: "", v: 2, s: 5 },
      { id: "ci-dev", slot: "ci", title: "Niets van de agent: die kan niet bij git", desc: "Alleen de ontwikkelaar pusht, dus de pipeline draait zijn werk.", detail: "", v: 3, s: 5 },
      { id: "ci-review", slot: "ci", title: "Wat de ontwikkelaar eerst heeft gelezen", desc: "Hij leest alles voordat hij pusht, ook de tests.", detail: "", v: 4, s: 2 },
      { id: "ci-noinet", slot: "ci", title: "De runner heeft alleen toegang tot pakketten in de centrale Artifactory", desc: "Elke push start de pipeline, maar zonder internet.", detail: "Eenmalig inrichten met de beheerders.", v: 5, s: 4 },
      // devtok: het eigen token van de ontwikkelaar, op zijn laptop
      { id: "dt-credman", slot: "devtok", title: "Versleuteld, in de sleutelhanger van de laptop", desc: "Git haalt het op als het nodig is.", detail: "", v: 3, s: 4.5 },
      { id: "dt-plain", slot: "devtok", title: "Als platte tekst in een bestand", desc: "Het token staat leesbaar in ~/.git-credentials.", detail: "Eén keer intypen, daarna werkt het altijd.", v: 2, s: 5 },
      { id: "dt-cache", slot: "devtok", title: "Eén keer inloggen, daarna een tijdje onthouden", desc: "Git onthoudt het token een kwartier in het geheugen.", detail: "", v: 3, s: 4 },
      // model
      { id: "codex", slot: "model", title: "Codex Enterprise van OpenAI (cloud)", desc: "Het slimst en het snelst.", detail: "Alles wat de agent leest, gaat naar de cloud van OpenAI.", v: 4, s: 5 },
      { id: "qwen-werk", slot: "model", title: "Qwen op de servers van Rijkswaterstaat", desc: "Alles blijft bij Rijkswaterstaat. Thuis niet bereikbaar vanaf de laptop, wel vanuit de VM.", detail: "Minder slim en trager. Een Chinees model.", v: 4, s: 3.5 },
      { id: "local-model", slot: "model", title: "Een eigen model op je laptop", desc: "Een kleinere Qwen. Werkt ook thuis.", detail: "Het minst slim. Ook Chinees.", v: 4, s: 1.5 },
    ],
    rules: [
      // waar
      (s) => s.loc === "remote-vm" && { type: "good", text: "De agent kan niet bij de laptop: niet bij sleutels, tokens of de inlog van de ontwikkelaar, zolang die zijn inlog niet meeneemt naar de VM. Wel kost de VM geld en beheer." },
      (s) => s.loc === "remote-vm" && ["ci-open", "ci-dev"].includes(s.ci) && { type: "insight", text: "Aan de pipeline verandert de VM niets: wat de agent in de code zet, draait na een push op de runner, met internet." },
      (s) => s.loc === "devcontainer" && { type: "insight", text: "De devcontainer neemt de git-inlog van de ontwikkelaar mee, en het netwerk is open: de agent kan pushen als hem. Wel ziet hij alleen de projectmap, niet de rest van de laptop." },
      (s) => s.loc === "dc-closed" && { type: "insight", cap: { v: sbx(s) ? 4.5 : 4 }, text: "Geen inlog van de ontwikkelaar, alleen de projectmap, beperkt netwerk. Maar de projectmap deelt hij met de laptop: via bestanden daarin kan hij code op de laptop laten draaien." + (sbx(s) ? " De sandbox maakt een deel daarvan alleen-lezen." : "") + " [AANNAME: niet getest.]" },
      (s) => s.loc === "dc-closed" && sbx(s) && { type: "good", adj: { v: 0.5 }, text: "Twee lagen: de container schermt de laptop af, de sandbox het netwerk en git." },
      // inlog
      (s) => s.auth === "a-pat" && { type: "risk", cap: { v: 2 }, text: "De agent kan alles wat de ontwikkelaar kan, in al zijn projecten. En hij kan het token lezen: dan staat het bij het model." },
      (s) => s.auth === "a-credman" && { type: "insight", cap: { v: 2 }, text: !devLogin(s)
        ? "In een Linux-VM of container is er meestal geen keychain: dan staat het token toch in een bestand. En het blijft het token van de ontwikkelaar, met al zijn rechten."
        : "De keychain beschermt tegen een token in een bestand, niet tegen de agent: die vraagt het gewoon aan git. En het blijft het token van de ontwikkelaar, met al zijn rechten." },
      (s) => s.auth === "a-bot" && { type: "good", adj: { v: 0.5 }, text: "GitLab dwingt af wat het token mag: alleen deze repo, alleen deze rechten, en het verloopt vanzelf. Verder dan deze repo komt de agent niet." },
      (s) => s.auth === "a-bot" && ["g-pull", "g-dev"].includes(s.git) && { type: "insight", text: "Mag de agent niet pushen? Met een token met alleen leesrechten dwingt GitLab dat af." },
      (s) => s.auth === "a-bot" && s.perm && !sbx(s) && devLogin(s) && { type: "insight", adj: { v: -0.5 }, text: "Maar de agent draait nog als de ontwikkelaar" + (s.loc === "devcontainer" ? ", via de devcontainer" : "") + ": diens eigen inlog werkt ook voor hem. Het eigen token telt pas als hij daar niet bij kan." },
      (s) => s.auth === "a-none" && (s.git === "g-agent"
        ? { type: "risk", cap: { v: 3 }, text: "‘Geen inlog’ en ‘de agent pusht zelf’ kan alleen met de inlog van de ontwikkelaar. Dan heeft hij dus toch een inlog." }
        : { type: "insight", adj: { s: -0.5 }, text: "De agent komt niet bij GitLab. Maar de ontwikkelaar moet nu alles overzetten: dat kost tijd." }),
      // toestemming
      (s) => s.perm === "h-yolo" && { type: "risk", cap: { v: s.auth === "a-pat" ? 1 : 2 }, text: "Geen sandbox en geen vragen: een fout of een verborgen instructie in een issue wordt meteen uitgevoerd" + (!devLogin(s) ? ". " + awayName(s).replace("de ", "De ") + " houdt hem weg van de laptop" + (s.auth && s.auth !== "a-none" ? ", niet van GitLab." : ".") : ", met de rechten van de ontwikkelaar.") },
      (s) => s.perm === "h-askall" && { type: "insight", adj: { v: -0.5, s: -1 }, text: "De ontwikkelaar ziet alles, maar zit de hele tijd naast de agent. Na de tiende keer ‘ja’ leest hij niet meer goed." },
      (s) => s.perm === "h-allow" && { type: "insight", cap: { v: 2 }, text: "Een regel op de tekst van een commando is geen slot: er zijn genoeg andere manieren om te pushen, en die gaan er gewoon doorheen." },
      (s) => s.perm === "h-autosafe" && { type: "risk", cap: { v: 2 }, text: "Het model dat het werk doet, beslist zelf wat veilig is. Een verborgen instructie in een issue stuurt juist dat model. En zonder sandbox draait alles als de ontwikkelaar, met netwerk." },
      (s) => s.perm === "h-autoreview" && isQwen(s.model) && { type: "risk", adj: { s: -2 }, text: "Met Qwen werkt auto-review niet: Codex vraagt om een eigen reviewmodel van OpenAI, dat er dan niet is, en weigert alles buiten de sandbox (getest)." },
      (s) => s.perm === "h-autoreview" && !isQwen(s.model) && { type: "insight", text: "Binnen de sandbox verandert niets. Wil de agent eruit, dan beslist een reviewmodel van OpenAI in plaats van de ontwikkelaar. Dat kan zich vergissen of misleid worden, en wat het goedkeurt, draait buiten de sandbox. Wel hoeft niemand steeds ‘ja’ te klikken." },
      (s) => sbx(s) && s.loc === "remote-vm" && { type: "good", adj: { v: 0.5 }, text: "Twee lagen: de VM schermt de laptop af, de sandbox het netwerk." },
      (s) => ["h-sandbox", "h-autoreview"].includes(s.perm) && s.loc === "laptop" && { type: "insight", cap: { v: 3.5 }, text: "De sandbox beperkt schrijven en netwerk, niet lezen. Op de laptop kan de agent sleutels en tokens lezen, en wat hij leest, gaat naar het model." },
      (s) => s.perm === "h-profile" && (s.loc === "laptop"
        ? { type: "good", cap: { v: 4 }, text: "Het profiel schermt de bekende plekken met sleutels en tokens af (getest). Wat niet op de lijst staat, kan de agent nog lezen. Het profiel zelf kan hij niet aanpassen." }
        : s.loc && { type: "insight", text: "Het profiel schermt paden af. " + (s.loc === "remote-vm" ? "In de VM staat er weinig om af te schermen." : "In de devcontainer ziet de agent al alleen de projectmap.") }),
      // het eigen token van de ontwikkelaar
      (s) => s.devtok === "dt-plain" && (s.loc && devLogin(s)
        ? (s.perm === "h-profile" && s.loc === "laptop"
          ? { type: "insight", adj: { v: -0.5 }, text: "Staat het bestand in het profiel, dan kan de agent het niet lezen. Elk ander programma op de laptop wel." }
          : { type: "risk", cap: { v: 2 }, text: "Het token staat leesbaar in een bestand. De agent draait als de ontwikkelaar en leest het gewoon" + (s.loc === "devcontainer" ? ", ook in de devcontainer." : ", ook in de sandbox.") + " Dan staat het bij het model." })
        : s.loc && { type: "insight", adj: { v: -0.5 }, text: "De agent in " + awayName(s) + " kan niet bij dit bestand. Elk ander programma op de laptop wel." }),
      (s) => s.devtok === "dt-credman" && (s.loc && devLogin(s)
        ? (sbx(s) && s.loc === "laptop"
          ? { type: "good", ignoreMin: ["devtok"], text: "In de sandbox kan de agent het token niet uit de sleutelhanger halen (getest op een Mac). Buiten de sandbox wel: een commando dat " + (s.perm === "h-autoreview" ? "de reviewer" : "de ontwikkelaar") + " goedkeurt, kan er dus bij." }
          : { type: "insight", cap: { v: 3 }, text: "Versleuteld, maar de agent hoeft het niet zelf te lezen: hij vraagt het gewoon aan git." + (s.loc === "devcontainer" ? " En de devcontainer stuurt de inlog door." : " Zonder sandbox houdt niets dat tegen.") })
        : s.loc && { type: "good", ignoreMin: ["devtok"], text: "Het token staat versleuteld op de laptop. De agent in " + awayName(s) + " kan er niet bij." }),
      (s) => s.devtok === "dt-cache" && (s.loc && devLogin(s)
        ? (sbx(s) && s.loc === "laptop"
          ? { type: "good", ignoreMin: ["devtok"], text: "In de sandbox kan de agent niet bij het onthouden token (getest op een Mac). Buiten de sandbox wel: een commando dat " + (s.perm === "h-autoreview" ? "de reviewer" : "de ontwikkelaar") + " goedkeurt, kan er dus bij." }
          : { type: "insight", cap: { v: 3 }, text: "Zolang git het token onthoudt, kan de agent het opvragen. En wie de hele dag met git werkt, is bijna altijd ingelogd." + (s.loc === "devcontainer" ? " De devcontainer stuurt de inlog ook door." : " Zonder sandbox houdt niets dat tegen.") })
        : s.loc && { type: "good", ignoreMin: ["devtok"], text: "Het token staat even in het geheugen van de laptop. De agent in " + awayName(s) + " kan er niet bij." }),
      // model
      (s) => s.model === "codex" && (s.loc === "laptop" && s.perm !== "h-profile"
        ? { type: "insight", adj: { v: -0.5 }, text: "Het slimste en snelste model. Wat de agent leest, gaat naar OpenAI: de code, maar ook sleutels en tokens die hij op de laptop tegenkomt." }
        : s.loc && { type: "good", text: "Het slimste en snelste model. Wat de agent leest, gaat naar OpenAI: hier alleen de code" + (s.loc === "laptop" ? ", want het profiel schermt sleutels en tokens af." : s.loc === "remote-vm" ? ", want in de VM staat verder niets." : ", want de container ziet alleen de projectmap.") }),
      (s) => s.model === "qwen-werk" && (s.loc === "remote-vm"
        ? { type: "insight", text: "Alles blijft bij Rijkswaterstaat, ook als je vanuit de VM thuiswerkt. Maar het model is minder slim en trager dan Codex." }
        : s.loc && { type: "insight", adj: { s: -0.5 }, text: "Alles blijft bij Rijkswaterstaat. Maar thuis bereik je deze servers niet vanaf de laptop: dan werk je alleen op kantoor." }),
      (s) => s.model === "local-model" && (s.loc === "remote-vm"
        ? { type: "risk", adj: { s: -2 }, text: "De VM bereikt het model op je laptop niet. Dit werkt niet." }
        : { type: "insight", adj: { s: -0.5 }, text: "Werkt ook thuis. Maar het minst slimme model: meer fouten, meer werk voor de ontwikkelaar." }),
      (s) => isQwen(s.model) && { type: "insight", text: "Qwen is een Chinees model. Niet de herkomst bepaalt het risico, maar de weg naar buiten: " + (sbx(s) ? "in de sandbox hebben zijn commando's geen netwerk." : "zonder sandbox kunnen zijn commando's het internet op.") + " Meer in ronde 2." },
      (s) => sbx(s) && { type: "good", text: "In de repo werkt de agent zonder vragen. Voor netwerk, git en alles buiten de repo vraagt hij " + (s.perm === "h-autoreview" ? "de reviewer" : "de ontwikkelaar") + " om toestemming." + " Lezen buiten de repo kan wel." },
      (s) => sbx(s) && ["a-pat", "a-credman"].includes(s.auth) && !["ci-review", "ci-noinet"].includes(s.ci) && { type: "risk", adj: { v: -0.5 }, text: "In de sandbox kan de agent zelf niets met het token. Maar hij kan het lezen en in de code zetten, en die code draait na de push op de runner, met internet." },
      // pullen en pushen
      (s) => s.git === "g-agent" && (noAsk(s)
        ? { type: "risk", cap: { v: 2 }, text: "De agent pusht, en niemand ziet wat of waarheen." }
        : s.perm === "h-autoreview" ? { type: "insight", text: isQwen(s.model) ? "Met Qwen weigert Codex elke push: de agent kan niet zelf pushen." : "De agent pusht zelf, en de reviewer beslist, niet de ontwikkelaar. Met pushrecht kan de agent in theorie branches verpesten, ook die van anderen." }
        : s.perm && { type: "insight", text: "De agent pusht zelf, maar het harnas vraagt het eerst. Met pushrecht kan de agent in theorie branches verpesten, ook die van anderen." }),
      (s) => ["g-pull", "g-dev"].includes(s.git) && (noAsk(s)
        ? (devLogin(s)
          ? { type: "risk", cap: { v: 2 }, text: "Afgesproken, niet afgedwongen. De agent draait als de ontwikkelaar" + (s.loc === "devcontainer" ? " (de devcontainer stuurt diens inlog door)" : "") + ": kan die pushen, dan de agent ook." + (["a-pat", "a-credman", "a-bot"].includes(s.auth) ? " En hij heeft zelf ook een inlog die kan pushen." : "") }
          : s.auth === "a-none"
            ? { type: "good", text: "Afgedwongen: in " + awayName(s) + " staat geen inlog die kan pushen." }
            : { type: "risk", cap: { v: 2 }, text: "De agent heeft in " + awayName(s) + " zelf een inlog die kan pushen. Zonder sandbox of vragen is ‘de ontwikkelaar pusht’ een afspraak." })
        : s.perm === "h-askall" ? { type: "insight", text: "De ontwikkelaar ziet elke push van de agent langskomen. Zolang hij blijft lezen." }
        : s.perm === "h-autoreview" ? { type: "insight", text: isQwen(s.model) ? "Met Qwen weigert Codex elke push van de agent." : "Een push gaat nu naar de reviewer, niet naar de ontwikkelaar. Of die elke push weigert, hangt af van een model: geen slot." }
        : sbx(s) && { type: "good", adj: { v: 0.5 }, text: "Afgedwongen: in de sandbox heeft de agent geen netwerk. Een push vraagt hij eerst, en de ontwikkelaar zegt nee." + (s.git === "g-pull" ? " Pullen en committen vraagt hij ook." : "") }),
      // mergen
      (s) => s.merge === "m-agent" && (s.auth === "a-none"
        ? { type: "insight", text: "Zonder inlog kan de agent niet mergen." }
        : { type: "risk", cap: { v: 2 }, text: "Niemand leest de code voordat die op main komt en live gaat. Een groene pipeline zegt weinig: de agent schreef de tests zelf." + (s.auth === "a-bot" ? " En zijn eigen token heeft nu merge-recht nodig." : s.auth === "a-pat" ? " Met het token van de ontwikkelaar kan hij mergen in al diens projecten." : "") }),
      (s) => s.merge === "m-dev" && { type: "good", text: "Een mens leest de code voordat die op main komt en live gaat. Afgedwongen als main beschermd is en het token van de agent geen merge-recht heeft." + (s.git === "g-agent" ? " Dan mag de agent zelf naar zijn branch pushen: main blijft van de mens." : "") },
      // pipeline
      (s) => s.ci === "ci-open" && { type: "risk", cap: { v: s.git === "g-agent" ? 2 : 3 }, text: "Wat de agent in de code of de tests zet, draait na een push op de runner, met internet, buiten elke sandbox en voordat iemand kijkt." + (s.git && s.git !== "g-agent" ? " Ook als de ontwikkelaar pusht." : "") },
      (s) => s.ci === "ci-dev" && { type: "insight", cap: { v: 2 }, text: "De pipeline draait wat er in de branch staat, niet wie er pusht. Ook als de agent nooit bij git kan, draait zijn code op de runner, met internet." },
      (s) => s.ci === "ci-review" && (s.git === "g-agent" && noAsk(s)
        ? { type: "risk", cap: { v: 2 }, text: "De agent pusht zonder dat iemand kijkt: er is geen moment om te lezen." }
        : { type: "insight", cap: { v: 4 }, adj: { s: -0.5 }, text: "Werkt alleen als hij echt alles leest, na elke wijziging opnieuw, ook de tests. Dat kost tijd. Wat erdoor glipt, draait op een runner met internet." }),
      (s) => s.ci === "ci-noinet" && { type: "good", text: "De code van de agent draait op de runner, maar kan niets naar buiten sturen. Niemand hoeft daarvoor eerst alle tests te lezen. Na de merge gaat de code wel live." },
      (s) => s.ci === "ci-noinet" && s.git === "g-agent" && s.auth === "a-bot" && { type: "good", ignoreMin: ["git"], adj: { v: 0.5 }, text: "Met een smal token en een runner zonder internet kan de code van de agent niets naar buiten sturen, ook als hij zelf pusht." },
    ],
  },

  // ───────────────────────────── RONDE 2 ─────────────────────────────
  {
    id: "r2",
    nr: 2,
    label: "Ronde 2",
    title: "Je laptop opruimen",
    selfEval: true,
    story: [
      "Een data scientist heeft een volle laptop: 40 GB in Downloads, tientallen oude conda-envs en oude kopieën van repo's.",
      "Ze wil samen met een agent door haar laptop gaan. De agent stelt voor wat weg kan en verplaatst dat naar een quarantainemap. Die leegt ze later zelf.",
      "Dat kan alleen op de laptop zelf, want daar staan de bestanden.",
    ],
    task: "Hoe doe je dat veilig? Kies welk harnas je gebruikt en hoe het staat ingesteld, wat de agent bekijkt, welk model, en of de agent het internet op mag.",
    facts: [
      "In sommige oude repo's staat werk dat nooit is gepusht. Eén conda-env hoort bij een project dat nog loopt.",
      "In Downloads staan pdf's en bijlagen van buiten. Daar kan een verborgen instructie voor de agent in staan.",
      "Qwen draait op de servers van Rijkswaterstaat, zonder internet en zonder iets op te slaan. Bereikbaar op het netwerk van Rijkswaterstaat (op kantoor), niet thuis, ook niet via VPN.",
      "Codex Enterprise van OpenAI (in de cloud) is het slimst. Qwen is minder slim. Een eigen model op je laptop (een kleinere Qwen) werkt ook thuis, maar is nog minder slim en maakt nog meer fouten. Qwen is een Chinees model, van Alibaba.",
      "Codex als harnas kan ook met Qwen werken.",
    ],
    focus: "laptop",
    zones: {
      laptop: "Je laptop",
      mens: "Jij stuurt",
      harness: "Harnas",
      agent: "De agent op je laptop",
      model: "Modellen",
      internet: "Internet",
    },
    zoneNotes: {
      laptop: "40 GB in Downloads, oude conda-envs en oude kopieën van repo's. Op dezelfde laptop staan ook je ssh-sleutels, je git-inlog en je documenten.",
      mens: "Geeft de opdracht en keurt goed wat de agent wil doen.",
      harness: "Het programma om het model heen. Het draait op je laptop: het leest bestanden en voert commando's uit.",
      agent: "Gaat met jou door de laptop, stelt voor wat weg kan en verplaatst het naar de quarantainemap.",
      model: "Bedenkt wat er moet gebeuren, en krijgt alles wat het harnas leest.",
    },
    arrows: { agent: "kijkt rond en verplaatst", mens: "jouw bestanden", between: "opdracht en goedkeuring", model: "alles wat de agent leest", rest: "naar buiten?" },
    slots: [
      { id: "look", zone: "laptop", label: "Wat bekijkt de agent?" },
      { id: "harness", zone: "harness", label: "Welk harnas, en hoe staat het ingesteld?" },
      { id: "model", zone: "model", label: "Welk model?" },
      { id: "net", zone: "internet", label: "Mag de agent het internet op?" },
    ],
    blocks: [
      // look
      { id: "look-all", slot: "look", title: "Alles, ook wat erin staat", desc: "Hij opent bestanden om te zien wat ze zijn.", detail: "Nauwkeurig: hij weet wat hij voorstelt.", v: 3, s: 5 },
      { id: "look-names", slot: "look", title: "Alleen namen, grootte en datum", desc: "Je draagt hem op geen bestanden te openen. Daaruit stelt hij voor wat weg kan.", detail: "Minder nauwkeurig: hij weet niet wat erin staat.", v: 4, s: 3.5 },
      // harness
      { id: "h-codex", slot: "harness", title: "Codex met sandbox", desc: "Hij kan overal kijken. Voor elke verplaatsing naar de quarantainemap vraagt hij het jou.", detail: "Alleen in de quarantainemap mag hij zelf schrijven en weggooien.", v: 4, s: 3.5 },
      { id: "h-codex-profile", slot: "harness", title: "Codex met sandbox en een eigen profiel (opgesteld samen met GPT-6.1)", desc: "Als Codex met sandbox, plus een profiel dat je sleutels en tokens afschermt.", detail: "Eén keer goed opstellen.", v: 4.5, s: 4 },
      { id: "h-codex-home", slot: "harness", title: "Codex met sandbox, je hele home-map als werkmap", desc: "Hij mag overal in je home-map verplaatsen en weggooien, zonder te vragen. Geen netwerk.", detail: "", v: 2.5, s: 5 },
      { id: "h-codex-auto", slot: "harness", title: "Codex met sandbox en auto-review (‘Approve for me’)", desc: "Als Codex met sandbox, maar een reviewmodel van OpenAI keurt de verplaatsingen goed in plaats van jij.", detail: "Werkt alleen met een model van OpenAI.", v: 3.5, s: 4.5 },
      { id: "h-full", slot: "harness", title: "Codex op Full Access", desc: "Geen sandbox en geen vragen.", detail: "Tien minuten en klaar.", v: 1, s: 5 },
      { id: "h-cline", slot: "harness", title: "Cline in VS Code met auto-approve", desc: "Vertrouwd, werkt met Qwen. Het model bepaalt zelf welke commando's veilig zijn; alleen voor de rest vraagt hij.", detail: "Geen sandbox.", v: 2, s: 5 },
      // net
      { id: "net-open", slot: "net", title: "Internet open", desc: "Hij kan dingen opzoeken.", detail: "", v: 1, s: 5 },
      { id: "net-sandbox", slot: "net", title: "Netwerk uit voor zijn commando's", desc: "Alleen de verbinding met het model blijft.", detail: "Werkt alleen in een harnas met sandbox.", v: 4, s: 4 },
      { id: "net-ask", slot: "net", title: "Hij vraagt het als hij internet nodig heeft", desc: "Per keer goedkeuren.", detail: "", v: 3, s: 3 },
      // model
      { id: "qwen-werk", slot: "model", title: "Qwen op de servers van Rijkswaterstaat", desc: "Wat de agent leest, blijft bij Rijkswaterstaat. Alleen op kantoor.", detail: "Minder slim en trager. Een Chinees model.", v: 4, s: 3.5 },
      { id: "codex", slot: "model", title: "Codex Enterprise van OpenAI (cloud)", desc: "Het slimst en het snelst.", detail: "Alles wat de agent bekijkt, gaat naar de cloud.", v: 2, s: 5 },
      { id: "local-model", slot: "model", title: "Een eigen model op je laptop", desc: "Een kleinere Qwen. Alles blijft op je laptop, ook thuis.", detail: "Het minst slim. Ook Chinees.", v: 4, s: 1.5 },
    ],
    rules: [
      (s) => s.model === "codex" && { type: "risk", cap: { v: 2 }, text: "Wat de agent bekijkt, gaat naar de cloud. In Downloads staat van alles, en ook bestandsnamen zeggen al veel." },
      (s) => s.model === "qwen-werk" && { type: "insight", text: "Wat de agent leest, blijft bij Rijkswaterstaat. Maar thuis bereik je deze servers niet: dit doe je op kantoor." },
      (s) => s.model === "local-model" && { type: "insight", text: "Alles blijft op je laptop, ook thuis. Maar het minst slimme model doet de slechtste voorstellen." },
      (s) => isQwen(s.model) && (s.net === "net-open" || (s.net === "net-sandbox" && !sandboxHarness(s.harness))
        ? { type: "risk", text: qwenNews + " Hier zou zo'n upload slagen, bij elk model. Een ander model kiezen verandert dat niet." }
        : s.net === "net-sandbox" && { type: "good", text: qwenNews + " Hier loopt zo'n poging dood: de commando's van de agent hebben geen netwerk." }),
      // wat hij bekijkt
      (s) => s.look === "look-all" && { type: "insight", text: "Hij weet goed wat hij voorstelt. Maar alles wat hij opent, gaat naar het model, ook pdf's met een verborgen instructie." },
      (s) => s.look === "look-names" && { type: "insight", text: "Wat erin staat, blijft buiten het model, zolang hij zich aan de opdracht houdt: het is een instructie, geen slot. En op naam alleen zijn de voorstellen minder precies." },
      // harnas
      (s) => s.harness === "h-codex" && { type: "good", text: "Zonder jouw ja verplaatst hij niets, wat er ook in een pdf staat. Wat je goedkeurt, draait buiten de sandbox. Zelf weggooien kan hij alleen in de quarantainemap." },
      (s) => s.harness === "h-codex-profile" && { type: "good", text: "Zonder jouw ja verplaatst hij niets, en je sleutels en tokens kan hij niet lezen. Wat niet op de lijst staat, wel. Eén keer goed opgesteld, kun je daarna de touwtjes losser laten." },
      (s) => s.harness === "h-codex-home" && { type: "risk", cap: { v: 3 }, text: "Geen netwerk, maar in je hele home-map kan hij zonder vragen verplaatsen, en ook echt weggooien in plaats van verplaatsen. Dat de quarantainemap gebruikt wordt, is dan een afspraak." },
      (s) => s.harness === "h-codex-auto" && (isQwen(s.model)
        ? { type: "risk", adj: { s: -2 }, text: "Met Qwen werkt auto-review niet: Codex vraagt om een eigen reviewmodel van OpenAI, dat er dan niet is, en weigert elke verplaatsing (getest)." }
        : { type: "good", text: "Jij hoeft niet elke verplaatsing goed te keuren: een reviewmodel van OpenAI doet het. Dat kan zich vergissen, en wat het goedkeurt, gebeurt." }),
      (s) => s.harness === "h-full" && { type: "risk", cap: { v: 1 }, text: "Geen sandbox en geen vragen: elke fout of injectie draait meteen, met jouw rechten op je hele laptop. Ook een rm in plaats van een verplaatsing." },
      (s) => s.harness === "h-cline" && { type: "risk", cap: { v: 2 }, text: "Geen sandbox: commando's draaien als jij. Het model beslist zelf wat veilig is, ook een rm in plaats van een verplaatsing." },
      // netwerk
      (s) => s.net === "net-open" && { type: "risk", cap: { v: 2 }, text: "Een pdf met een verborgen instructie en een agent met internet: dan kan alles naar buiten." },
      (s) => s.net === "net-sandbox" && !sandboxHarness(s.harness) && s.harness && { type: "risk", cap: { v: 2 }, text: "Dit harnas heeft " + (s.harness === "h-full" ? "op Full Access " : "") + "geen sandbox: het netwerk staat gewoon open." },
      (s) => s.net === "net-ask" && { type: "insight", adj: { v: -0.5 }, text: "Na de tiende vraag klik je ‘niet meer vragen’. Dan staat het internet open." },
    ],
  },

  // ───────────────────────────── EINDRONDE ─────────────────────────────
  {
    id: "eind",
    nr: 3,
    label: "Ronde 3",
    title: "Gevoelige data",
    selfEval: true,
    carrySummary: true,
    story: [
      "Een data scientist moet vrijdag een analyse opleveren van 18.000 storingsmeldingen over bruggen, tunnels en sluizen. Daarin staan zwakke plekken, beveiligingsdetails en namen van bestuurders. De export staat op de netwerkschijf.",
      "Ze wil samen met de agent een script schrijven en dat via een MR in GitLab zetten. En als het kan, ruimt de agent meteen haar Downloads op.",
    ],
    task: "Bouw een veilige opstelling voor deze gevoelige data. Jullie keuzes uit ronde 1 en 2 staan al ingevuld waar ze passen: kloppen ze hier nog? Daarna vertellen jullie klassikaal wat jullie kozen, en waarom.",
    facts: [
      "Een deel van de meldingen komt van aannemers en weggebruikers: tekst van buiten.",
      "Op haar laptop is ze in twee uur klaar.",
      "De remote VM kost geld per maand, en de data moet ernaartoe. Een afgesloten VM op de laptop kan ook: het model hoeft niet in de VM te draaien.",
      "Qwen op de servers van Rijkswaterstaat is bereikbaar op het netwerk van Rijkswaterstaat en vanuit de remote VM, ook als je thuiswerkt. Thuis vanaf je laptop niet, ook niet via VPN.",
      "Codex van OpenAI is het slimst, Qwen op de servers van Rijkswaterstaat minder, een eigen model op je laptop (een kleinere Qwen) het minst. Qwen is een Chinees model.",
    ],
    focus: "data",
    zones: {
      data: "Gevoelige data",
      mens: "De data scientist werkt met de agent",
      vm: "VM",
      harness: "Harnas",
      agent: "De agent",
      model: "Modellen",
      gitlab: "GitLab",
      artifactory: "Artifactory",
      internet: "Internet",
    },
    zoneNotes: {
      data: "Een export van 18.000 storingsmeldingen op de netwerkschijf. Een deel komt van aannemers en weggebruikers: tekst van buiten.",
      vm: "Een extra laag om het harnas heen. Of toch gewoon de laptop.",
      harness: "Voert de commando's uit op de plek waar de agent draait.",
      agent: "Schrijft samen met haar het script voor de analyse.",
      model: "Krijgt alles wat het harnas leest, ook de meldingen.",
    },
    arrows: { agent: "leest", mens: "kent de data, levert de analyse", between: "opdracht en goedkeuring", model: "alles wat de agent leest", rest: "wat hij bereikt" },
    slots: [
      { id: "hitl", zone: "mens", label: "Waar kijkt zij mee?" },
      { id: "cleanup", zone: "mens", label: "De opruimklus" },
      { id: "harness", zone: "harness", label: "Welk harnas?", carry: [["r2", "harness"]] },
      { id: "model", zone: "model", label: "Welk model?", carry: [["r2", "model"]] },
      { id: "loc", zone: "vm", label: "Waar draait de agent?", carry: [["r1", "loc"]] },
      { id: "data", zone: "data", label: "Welke data ziet de agent?" },
      { id: "auth", zone: "gitlab", label: "Met welke inlog komt de agent bij GitLab?", carry: [["r1", "auth"]] },
      { id: "git", zone: "gitlab", label: "Wie pullt en pusht?", carry: [["r1", "git"]] },
      { id: "pkg", zone: "artifactory", label: "Waar komen pakketten vandaan?" },
      { id: "net", zone: "internet", label: "Wat mag de agent naar buiten?", carry: [["r2", "net"]] },
    ],
    blocks: [
      // loc
      { id: "laptop", slot: "loc", title: "Gewoon op de laptop", desc: "Alles staat klaar.", detail: "", v: 1, s: 5 },
      { id: "laptop-sandbox", slot: "loc", title: "Laptop + sandbox van het harnas", desc: "Schrijven alleen in de projectmap, geen netwerk voor commando's.", detail: "Zoals bij het opruimen in ronde 2.", v: 2, s: 4.5, from: "r2" },
      { id: "local-vm", slot: "loc", title: "VM op je laptop, afgesloten", desc: "Alleen de projectmap gedeeld, niets doorgestuurd.", detail: "Gratis. Eén keer opzetten, samen met GPT-6.1. Het model draait elders. Thuis bereikt hij de servers van Rijkswaterstaat niet.", v: 4, s: 3.5 },
      { id: "devcontainer", slot: "loc", title: "Devcontainer in VS Code", desc: "Eén klik, je git-inlog werkt meteen.", detail: "Draait op de laptop, met de projectmap.", v: 2, s: 4.5, from: "r1" },
      { id: "remote-vm", slot: "loc", title: "De remote VM van Rijkswaterstaat", desc: "Voor dit project opgezet en goedgekeurd, beheerd door anderen.", detail: "Kost geld per maand. Bereikt Qwen op de servers van Rijkswaterstaat, ook thuis.", v: 4, s: 3.5, from: "r1" },
      // harness
      { id: "h-codex", slot: "harness", title: "Codex met sandbox", desc: "Met Qwen op de servers van Rijkswaterstaat als model.", detail: "Open source, van OpenAI. Geen netwerk voor commando's.", v: 4, s: 3.5 },
      { id: "h-codex-auto", slot: "harness", title: "Codex met sandbox en auto-review", desc: "Als Codex met sandbox, maar wil hij eruit, dan beslist een reviewmodel van OpenAI in plaats van zij.", detail: "Werkt alleen met een model van OpenAI.", v: 3.5, s: 4 },
      { id: "h-full", slot: "harness", title: "Codex op Full Access", desc: "Geen sandbox en geen vragen.", detail: "", v: 1, s: 5 },
      { id: "h-qwencode", slot: "harness", title: "Qwen Code met sandbox", desc: "Geen netwerk voor commando's.", detail: "Open source, van Alibaba. De sandbox werkt alleen op Linux.", v: 4, s: 3 },
      { id: "h-claude", slot: "harness", title: "Claude Code met Qwen, sandbox aan", desc: "Claude Code als harnas, Qwen op de servers van Rijkswaterstaat als model.", detail: "Van Anthropic. De sandbox zet je zelf aan.", v: 4, s: 3.5 },
      { id: "h-openhands", slot: "harness", title: "OpenHands met Docker-sandbox", desc: "Elke sessie in een eigen container. Werkt met elk model.", detail: "Open source, met een webinterface.", v: 4, s: 3.5 },
      { id: "h-cline", slot: "harness", title: "Cline in VS Code met auto-approve", desc: "Vertrouwd, werkt met Qwen. Het model bepaalt zelf welke commando's veilig zijn.", detail: "Geen sandbox.", v: 2, s: 5 },
      { id: "h-opencode", slot: "harness", title: "opencode met permissies", desc: "Voor commando's vraagt hij, gevoelige paden zijn verboden.", detail: "Werkt met elk model.", v: 2, s: 4 },
      // pkg
      { id: "pkg-pypi", slot: "pkg", title: "Rechtstreeks van pypi.org", desc: "pip install zoals altijd.", detail: "Werkt alleen als de VM pypi.org bereikt.", v: 2, s: 5 },
      { id: "pkg-proxy", slot: "pkg", title: "De centrale Artifactory, als doorgeefluik", desc: "Centraal geregeld. Wat er nog niet in staat, haalt hij zelf op van pypi.org.", detail: "Werkt ook als de VM geen internet heeft.", v: 3, s: 5 },
      { id: "pkg-kept", slot: "pkg", title: "De centrale Artifactory, alleen goedgekeurde versies", desc: "Centraal geregeld. Alleen gecontroleerde versies; een nieuw pakket vraag je eerst aan.", detail: "Werkt ook zonder internet.", v: 5, s: 3.5 },
      // net
      { id: "net-open", slot: "net", title: "Internet open", desc: "pip, documentatie, alles werkt.", detail: "", v: 1, s: 5 },
      { id: "net-sandbox", slot: "net", title: "Netwerk uit in de sandbox van het harnas", desc: "Commando's krijgen geen netwerk; de verbinding met het model blijft.", detail: "Werkt alleen in een harnas met sandbox.", v: 3, s: 4 },
      { id: "net-ask", slot: "net", title: "Hij vraagt het als hij internet nodig heeft", desc: "Per keer goedkeuren.", detail: "", v: 3, s: 3 },
      { id: "net-env-proxy", slot: "net", title: "Proxy met allowlist, via een instelling", desc: "Alleen GitLab, het model en documentatie.", detail: "", v: 2, s: 3.5 },
      { id: "net-allowlist", slot: "net", title: "Firewall: alleen de proxy mag naar buiten", desc: "Afgedwongen in de VM; de proxy laat alleen documentatie door.", detail: "", v: 4, s: 3 },
      { id: "net-closed", slot: "net", title: "Geen internet: alleen GitLab, de Artifactory en het model", desc: "Het strengste wat kan. Documentatie opzoeken kan niet.", detail: "", v: 5, s: 2.5 },
      // model
      { id: "qwen-werk", slot: "model", title: "Qwen op de servers van Rijkswaterstaat", desc: "Data blijft bij Rijkswaterstaat. Bereikbaar op kantoor en vanuit de remote VM.", detail: "Minder slim en trager. Een Chinees model.", v: 4, s: 3.5 },
      { id: "codex", slot: "model", title: "Codex Enterprise van OpenAI (cloud)", desc: "Het slimst en het snelst.", detail: "Wat de agent leest, gaat naar de cloud.", v: 2, s: 5 },
      { id: "local-model", slot: "model", title: "Een eigen model op je laptop", desc: "Een kleinere Qwen. Werkt ook thuis.", detail: "Het minst slim. Ook Chinees.", v: 4, s: 1.5 },
      { id: "openwebui-search", slot: "model", title: "Qwen in Open WebUI, met web search", desc: "Kan ook documentatie opzoeken op internet.", detail: "", v: 2, s: 4.5 },
      // data
      { id: "raw", slot: "data", title: "De volledige ruwe export", desc: "18.000 meldingen, met zwakke plekken en namen.", detail: "", v: 1, s: 4.5 },
      { id: "share", slot: "data", title: "Netwerkschijf koppelen", desc: "De agent pakt wat hij nodig heeft.", detail: "", v: 1, s: 5 },
      { id: "agent-pseudo", slot: "data", title: "Agent schoont eerst zelf op", desc: "De agent vervangt eerst zelf namen en objectnamen door codes.", detail: "", v: 2, s: 4 },
      { id: "qwen-pseudo", slot: "data", title: "Qwen schoont eerst alles op", desc: "Qwen haalt eerst namen en details uit alle meldingen; de agent werkt met de schone tekst.", detail: "", v: 2, s: 3.5, from: "r2" },
      { id: "sample", slot: "data", title: "Opgeschoonde steekproef", desc: "200 meldingen, namen en objecten vervangen door codes. Het script draait daarna zonder agent op alles.", detail: "", v: 5, s: 4 },
      // auth
      { id: "a-pat", slot: "auth", title: "Haar eigen token", desc: "Haar persoonlijke token, met al haar rechten.", detail: "", v: 2, s: 5 },
      { id: "a-credman", slot: "auth", title: "Een credential manager", desc: "Haar token in de keychain; git haalt het op.", detail: "", v: 3, s: 4.5, from: "r1" },
      { id: "a-bot", slot: "auth", title: "Een eigen token voor de agent", desc: "Alleen deze repo, alleen pullen, naar een branch pushen en een MR openen.", detail: "", v: 4, s: 3.5 },
      { id: "a-none", slot: "auth", title: "Geen inlog", desc: "Zij maakt de MR; de agent schrijft de beschrijving.", detail: "", v: 5, s: 3 },
      // git
      { id: "g-agent", slot: "git", title: "De agent pullt, commit en pusht", desc: "", detail: "", v: 2, s: 5 },
      { id: "g-pull", slot: "git", title: "De agent pullt en commit, zij pusht", desc: "", detail: "", v: 4, s: 4 },
      { id: "g-dev", slot: "git", title: "Alleen zij pullt en pusht", desc: "", detail: "", v: 5, s: 3.5 },
      // hitl
      { id: "per-action", slot: "hitl", title: "Elke actie goedkeuren", desc: "", detail: "", v: 3, s: 1 },
      { id: "per-batch", slot: "hitl", title: "Script en aanpak reviewen", desc: "Zij reviewt het script vóór de volledige run, een collega de MR.", detail: "", v: 4, s: 4 },
      { id: "none-hitl", slot: "hitl", title: "Geen", desc: "De agent levert het eindresultaat.", detail: "", v: 1, s: 5 },
      // cleanup
      { id: "c-same", slot: "cleanup", title: "Deze agent ruimt meteen op", desc: "Hij is toch bezig.", detail: "", v: 1, s: 5 },
      { id: "c-separate", slot: "cleanup", title: "Aparte sessie, met de opstelling uit ronde 2", desc: "Andere klus, andere opstelling.", detail: "", v: 5, s: 4 },
      { id: "c-list", slot: "cleanup", title: "Deze agent maakt een lijst, zij voert uit", desc: "", detail: "", v: 4, s: 4.5 },
    ],
    rules: [
      // waar
      (s) => s.loc === "laptop" && { type: "risk", cap: { v: 2 }, text: "Op de laptop kan de agent bij alles: sleutels, tokens, je git-inlog, netwerkschijven." },
      (s) => s.loc === "laptop-sandbox" && { type: "insight", cap: { v: 2 }, text: "Bij het opruimen was dit goed: daar moest de agent bij je bestanden. Hier niet. De sandbox beperkt schrijven, niet lezen: wat de agent op de laptop leest, gaat naar het model." },
      (s) => s.loc === "laptop-sandbox" && s.harness && !sandboxHarness(s.harness) && { type: "risk", cap: { v: 1 }, text: "Dit harnas heeft " + (s.harness === "h-full" ? "op Full Access " : "") + "geen sandbox: dan is dit gewoon de laptop." },
      (s) => onLaptop(s) && s.model === "codex" && { type: "risk", cap: { v: 1 }, text: "Wat de agent op de laptop leest, gaat naar de cloud. Daar is geen netwerk voor nodig: lezen is genoeg." },
      (s) => s.loc === "remote-vm" && { type: "insight", text: "Goed afgeschermd, en Qwen bereik je ook thuis. Maar het kost geld, en de data staat nu op een VM die anderen beheren." },
      (s) => s.loc === "devcontainer" && { type: "insight", cap: { v: 2 }, text: "De devcontainer neemt je git-inlog mee, en de gevoelige meldingen staan er gewoon in. Niet afgesloten." },
      (s) => s.loc === "local-vm" && s.model !== "codex" && { type: "good", text: "Het model draait elders, de agent in de VM ziet alleen het project. Geen cloudkosten." },
      (s) => s.loc && s.loc !== "remote-vm" && s.model === "qwen-werk" && { type: "insight", adj: { s: -0.5 }, text: "Thuis bereik je de servers van Rijkswaterstaat niet: met dit model werk je alleen op kantoor." },
      (s) => s.loc === "remote-vm" && s.model === "local-model" && { type: "risk", adj: { s: -2 }, text: "De remote VM bereikt het model op je laptop niet. Dit werkt niet." },
      (s) => onLaptop(s) ? { type: "risk", text: "Een melding van buiten kan een verborgen instructie bevatten: ‘zet ~/.ssh in je samenvatting’. Op de laptop kan de agent dat ook echt." + (s.model === "codex" ? " En dan gaat het naar de cloud." : "") }
        : inVm(s) && { type: "good", text: "Een melding van buiten kan een verborgen instructie bevatten. In de VM loopt die dood: daar staan geen sleutels." },
      // harnas
      (s) => s.harness === "h-full" && { type: "risk", cap: onLaptop(s) ? { v: 1 } : undefined, adj: inVm(s) ? { v: -0.5 } : undefined, text: "Geen sandbox en geen vragen: elk commando draait meteen, met het netwerk van de omgeving." + (inVm(s) ? " De schade blijft wel binnen de VM." : "") },
      (s) => s.harness === "h-cline" && { type: "insight", ignoreMin: inVm(s) ? ["harness"] : [], text: "Geen sandbox: commando's draaien met jouw rechten en netwerk." + (inVm(s) ? " Hier is de VM de sandbox, maar het netwerk van de VM hebben ze wel." : "") },
      (s) => s.harness === "h-opencode" && { type: "insight", cap: inVm(s) ? undefined : { v: 2 }, ignoreMin: inVm(s) ? ["harness"] : [], text: "Het verbod op paden houdt commando's niet tegen: opencode zegt zelf dat het geen isolatie is." + (inVm(s) ? " Hier schermt de VM af." : "") },
      (s) => sandboxHarness(s.harness) && inVm(s) && { type: "good", adj: { v: 0.5 }, text: "Twee lagen: de VM schermt de laptop af, de sandbox het netwerk." },
      (s) => sandboxHarness(s.harness) && { type: "insight", text: "Het harnas kan zelf gebruiksgegevens naar zijn maker sturen, en elke update kan dat veranderen." },
      (s) => s.harness === "h-codex-auto" && s.model && (s.model === "codex"
        ? { type: "insight", adj: { v: -0.5 }, text: "Wil de agent de sandbox uit, dan beslist een reviewmodel van OpenAI, niet zij. Dat leest de sessie mee, met gevoelige meldingen erin, en kan zich vergissen." }
        : { type: "risk", adj: { s: -2 }, text: "Met Qwen werkt auto-review niet: Codex vraagt om een eigen reviewmodel van OpenAI, dat er dan niet is, en weigert alles buiten de sandbox (getest)." }),
      (s) => s.harness === "h-claude" && { type: "insight", text: "‘Claude Code’ zegt niets over het model: de meldingen gaan naar Qwen bij Rijkswaterstaat, niet naar Anthropic. Wel gaan standaard gebruiksgegevens naar Anthropic." },
      (s) => s.harness === "h-qwencode" && s.model === "codex" && { type: "insight", text: "Codex Enterprise gebruik je normaal via Codex zelf, niet via Qwen Code." },
      // netwerk
      (s) => s.net === "net-open" && { type: "risk", cap: { v: 2 }, text: "Gevoelige data, tekst van buiten en een weg naar buiten: één melding hoeft alleen nog om een upload te vragen." },
      (s) => onLaptop(s) && ["net-allowlist", "net-closed", "net-env-proxy"].includes(s.net) && { type: "risk", cap: { v: 2 }, text: "Netwerkregels van een VM gelden niet op de laptop: die heeft gewoon internet." },
      (s) => s.net === "net-sandbox" && s.harness && !sandboxHarness(s.harness) && { type: "risk", cap: { v: 2 }, text: "Dit harnas heeft " + (s.harness === "h-full" ? "op Full Access " : "") + "geen sandbox: het netwerk staat gewoon open." },
      (s) => s.net === "net-ask" && { type: "insight", adj: { v: -0.5 }, text: "Onder deadline-druk klik je binnen het uur ‘niet meer vragen’. Dan staat het internet open." },
      (s) => s.net === "net-env-proxy" && inVm(s) && { type: "insight", cap: { v: 2 }, text: "Een instelling is een verzoek, geen slot: een programma dat hem negeert, gaat direct naar buiten." },
      (s) => s.net === "net-allowlist" && inVm(s) && { type: "good", adj: { v: 0.5 }, text: "Afgedwongen: alleen de proxy mag naar buiten, en die alleen naar de lijst." },
      (s) => s.net === "net-closed" && inVm(s) && s.model !== "codex" && { type: "good", adj: { v: 0.5, s: -0.5 }, text: "Er is geen weg naar buiten. Pakketten komen uit de Artifactory; documentatie opzoeken kan niet." },
      (s) => s.pkg === "pkg-pypi" && inVm(s) && (s.net === "net-closed"
        ? { type: "risk", adj: { s: -2 }, text: "Zonder internet bereikt de VM pypi.org niet: pip install werkt niet." }
        : s.net === "net-allowlist" && { type: "risk", cap: { v: 3 }, text: "Dan moet pypi.org op de allowlist: elk pakket kan binnenkomen, en via pypi.org kan data naar buiten." }),
      (s) => s.pkg === "pkg-proxy" && { type: "insight", adj: { v: -0.5 }, text: "De VM hoeft zelf niet naar pypi.org. Maar het is geen filter: vraagt de agent een kwaadaardig pakket, dan haalt de Artifactory het gewoon op." },
      (s) => s.pkg === "pkg-kept" && inVm(s) && ["net-closed", "net-allowlist"].includes(s.net) && { type: "good", text: "Alleen gecontroleerde versies: een kwaadaardig pakket komt er niet in, en de afgeschermde VM werkt toch." },
      (s) => s.net === "net-closed" && s.model === "codex" && { type: "risk", adj: { s: -2 }, text: "Codex draait in de cloud: zonder weg naar OpenAI werkt de agent niet. Met die weg gaat alles wat hij leest naar buiten." },
      (s) => isQwen(s.model) && (s.net === "net-open" || (onLaptop(s) && s.net !== "net-sandbox") || (s.net === "net-sandbox" && s.harness && !sandboxHarness(s.harness))
        ? { type: "risk", text: qwenNews + " Hier zou zo'n upload slagen, bij elk model. Een ander model kiezen verandert dat niet." }
        : (["net-allowlist", "net-closed"].includes(s.net) || (s.net === "net-sandbox" && sandboxHarness(s.harness))) && { type: "good", text: qwenNews + " Hier loopt zo'n poging dood." }),
      // model en data
      (s) => s.model === "codex" && ["raw", "share", "agent-pseudo"].includes(s.data) && { type: "risk", cap: { v: 1 }, text: "Zwakke plekken van tunnels en bruggen en namen van bestuurders gaan naar een Amerikaanse cloud. Het cloudbeleid van het Rijk raadt dat af voor vitale infrastructuur (§4.3)." },
      (s) => s.model === "codex" && s.data === "sample" && { type: "insight", cap: { v: 3 }, text: "Opgeschoonde vrije tekst blijft lastig: namen staan midden in zinnen, en een tunnel is herkenbaar aan zijn ligging." },
      (s) => s.model === "local-model" && { type: "insight", adj: { s: -0.5 }, text: "Het minst slimme model: meer fouten, en dat met een deadline. Wel blijft alles op je laptop." },
      (s) => isQwen(s.model) && { type: "insight", text: "Qwen is een Chinees model. Het cloudbeleid van het Rijk sluit diensten uit landen met een offensief cyberprogramma uit (§4.2), maar Qwen op eigen servers is geen dienst van Alibaba. Wat telt, is de weg naar buiten." },
      (s) => s.model === "openwebui-search" && { type: "insight", cap: { v: 2 }, text: "Web search is een weg naar buiten, ook als het netwerk van de agent dicht is." },
      (s) => s.data === "share" && { type: "risk", cap: { v: s.model === "codex" ? 1 : 2 }, text: "De agent ziet de hele netwerkschijf, niet alleen deze export. Alles wat hij doorzoekt, gaat naar het model." },
      (s) => s.data === "agent-pseudo" && { type: "insight", cap: { v: isQwen(s.model) ? 3 : 1 }, text: "Om op te schonen moet de agent eerst alles lezen: alle ruwe data gaat dus toch naar het model." },
      (s) => s.data === "qwen-pseudo" && (s.model === "codex"
        ? { type: "insight", cap: { v: 2 }, text: "Een taalmodel is geen betrouwbaar filter: wat Qwen mist, gaat alsnog naar de Amerikaanse cloud." }
        : { type: "insight", cap: { v: 3 }, adj: { s: -0.5 }, text: "Met Qwen als model blijft alles al bij Rijkswaterstaat: de extra stap kost tijd en levert niets op." }),
      (s) => s.data === "sample" && { type: "good", text: "De agent heeft niet alle data nodig: sneller én veiliger." },
      // GitLab
      (s) => s.auth === "a-pat" && { type: "risk", cap: { v: 2 }, text: "De agent kan alles wat zij kan, in al haar projecten, en het token lezen. Eén melding kan vragen om het in de samenvatting te zetten." + (s.model === "codex" ? " Dan staat het ook bij de cloud-aanbieder." : "") },
      (s) => s.auth === "a-credman" && { type: "insight", cap: { v: 2 }, text: "Git geeft haar token gewoon aan de agent als die erom vraagt. Het blijft haar token, met al haar rechten." },
      (s) => s.auth === "a-bot" && { type: "good", text: "GitLab dwingt af wat de agent mag: alleen deze repo, alleen deze rechten." },
      (s) => s.auth === "a-none" && { type: "insight", adj: { s: -0.5 }, text: "Veilig, maar zij moet alles in GitLab zelf doen. Dat kost tijd, met een deadline." },
      (s) => s.git === "g-agent" && (sandboxHarness(s.harness) && s.harness !== "h-codex-auto" && s.loc !== "laptop"
        ? { type: "good", text: "De agent pusht zelf, maar het harnas vraagt het eerst. Met pushrecht kan de agent in theorie branches verpesten, ook die van anderen." }
        : s.harness && { type: "risk", adj: { v: -0.5 }, text: s.harness === "h-codex-auto" ? (s.model && s.model !== "codex" ? "Met Qwen weigert Codex elke push: de agent kan niet zelf pushen." : "De agent pusht, en de reviewer beslist, niet zij.") : "De agent pusht zonder dat iemand kijkt, met een sessie vol gevoelige meldingen." }),
      (s) => ["g-pull", "g-dev"].includes(s.git) && s.loc && (s.loc === "laptop" || s.loc === "devcontainer" || (s.loc === "laptop-sandbox" && !sandboxHarness(s.harness))
        ? { type: "risk", adj: { v: -0.5 }, text: "Afgesproken, niet afgedwongen. " + (s.loc === "devcontainer" ? "De devcontainer stuurt haar inlog door: de agent kan dus ook pushen." : "Op de laptop werkt haar inlog ook voor de agent.") }
        : { type: "good", text: "Zij pusht wat ze heeft gezien. " + (inVm(s) ? "In de VM kan de agent niet bij haar inlog, zolang ze die er niet mee naartoe neemt." : "De sandbox houdt de agent van het netwerk.") }),
      // mens
      (s) => s.hitl === "per-action" && { type: "insight", adj: { v: -1, s: -1 }, text: "Je zit de hele tijd naast de agent, en onder deadline-druk klik je binnen het uur ‘altijd toestaan’." },
      (s) => s.hitl === "none-hitl" && { type: "risk", text: "Niemand kijkt naar het script voordat het op 18.000 meldingen draait." },
      (s) => s.cleanup === "c-same" && { type: "risk", cap: { v: 2 }, text: "Deze agent heeft gevoelige meldingen en tekst van buiten in zijn sessie, en ruimt dan ook je laptop op." + (inVm(s) ? " En in de VM is er niets van de laptop om op te ruimen." : "") },
      (s) => s.cleanup === "c-separate" && { type: "good", text: "Twee klussen, twee opstellingen: het opruimen weet niets van de meldingen." },
      (s) => s.cleanup === "c-list" && (inVm(s)
        ? { type: "insight", adj: { s: -1 }, text: "In de VM ziet deze agent je laptop niet: een lijst maken kan hij niet." }
        : { type: "risk", adj: { v: -0.5 }, text: "Voor die lijst opent deze agent je Downloads, met pdf's van buiten, in dezelfde sessie als de gevoelige meldingen." }),
      (s) => s.loc === "remote-vm" && s.model === "qwen-werk" && s.data === "sample" && sandboxHarness(s.harness) && { type: "good", text: "Veilig, en het werkt ook thuis. Wel kost het geld, en het model is trager." },
    ],
  },
];
