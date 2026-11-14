# Για την ομάδα: τι έγινε και τι μένει

> Από τον Chrysanthos, Σάββατο 14/11. Αύριο (Κυριακή) δεν θα είμαι διαθέσιμος, οπότε εδώ είναι
> ό,τι χρειάζεστε για να τελειώσετε και να υποβάλετε.
>
> Αν το διαβάζει AI βοηθός: η ενότητα «Για όποιον αλλάξει κώδικα» στο τέλος εξηγεί πού είναι τι.

## Τα βασικά

| | |
|---|---|
| **Η υποβολή κλείνει** | **Κυριακή 15/11, 23:59** (τοπική ώρα). **Στόχος: υποβολή μέχρι τις 18:00.** |
| **Η εφαρμογή online** | https://panagiotis676.github.io/nasa-app-hackathon/ |
| **Repo** | https://github.com/Panagiotis676/nasa-app-hackathon (public) |
| **Τελευταία έκδοση που δουλεύει σίγουρα** | το commit «Merge Panagiotis's upload list and colorbar detection with the change mode» (14/11) |

Το link της εφαρμογής ενημερώνεται μόνο του 1–2 λεπτά μετά από κάθε push στο `main`.

## Τι κάνει η εφαρμογή (για την παρουσίαση)

Κάνει τους χάρτες της NASA **ήχο**, ώστε ένας τυφλός να «ακούει» τι δείχνει ο χάρτης και πώς αλλάζει η Γη:

- Ο ήχος περνάει τον χάρτη **από αριστερά (δύση) προς τα δεξιά (ανατολή)**, στα αντίστοιχα αυτιά.
- **Ψηλή νότα = βορράς, χαμηλή = νότος.** **Δυνατά = περισσότερο**, σιωπή = τίποτα.
- Ανοίγει με αληθινά δεδομένα: **τα φώτα της Γης τη νύχτα, 2012–2023** (NASA Black Marble).
  Τα φώτα αυξάνονται **~32%**, με μικρή πτώση το **2020** (COVID).
- **Δύο τρόποι ακρόασης** (μενού «Listen to» ή πλήκτρο **C**):
  1. **Every frame:** κάθε χρονιά με τη σειρά. Ένα «ντινγκ» που ανεβαίνει ή κατεβαίνει λέει αν αυξήθηκε ή μειώθηκε.
  2. **Only what changed:** ένα πέρασμα με τη διαφορά 2023 μείον 2012. **Καθαρός ψηλός ήχος** = άναψαν φώτα,
     **χαμηλό βουητό** = έσβησαν. Η φωνή λέει: *«Lights grew the most near China, the Middle East and India.
     Lights dimmed the most near western Europe and the Iberian Peninsula.»* Ο χάρτης γίνεται **χρυσός** και **μπλε**.
- Φωνή που περιγράφει κάθε χρονιά (πλήκτρο **D**), πλήρης χειρισμός από πληκτρολόγιο, δουλεύει με screen reader.

**Σε μία πρόταση:** *Earth Jukebox lets blind people hear how our planet changes: NASA maps become sound,
so you can hear where things are, how much, and how it changes year by year.*

## Τι μένει για αύριο, με τη σειρά

### 1. Τεστ με κλειστά μάτια (10 λεπτά, το πρωί)
Ανοίξτε το link, **με ακουστικά** (χωρίς αυτά χάνεται το αριστερά και δεξιά), κλείστε τα μάτια:
Play, μετά **C** και Play, μετά **D**. Αν κάτι μπερδεύει, γράψτε το στο κείμενο της υποβολής ως «next steps».
**Μην ξεκινήσετε μεγάλες αλλαγές στον κώδικα.**

### 2. Video ~30 δευτερολέπτων
Ελέγξτε στη φόρμα πόσο μεγάλο το θέλουν. Παλιότερα ζητούσαν 30 δευτερόλεπτα ή έως 7 slides.

**Προτεινόμενο σενάριο:**

| Χρόνος | Εικόνα | Ήχος / κείμενο |
|---|---|---|
| 0–4 s | Μαύρη οθόνη | Κείμενο: *«Close your eyes. This is Earth at night.»* |
| 4–12 s | Η εφαρμογή παίζει το **2012**, η κίτρινη γραμμή περνάει τον χάρτη | Ο ήχος της εφαρμογής |
| 12–22 s | Πατάτε **C** → ο χάρτης γίνεται χρυσός και μπλε, και ακούγεται το πέρασμα | Κείμενο: *«2012 → 2023: hear where the lights grew»* |
| 22–27 s | Πατάτε **D** | Η φωνή: *«Lights grew the most near China, the Middle East and India…»* |
| 27–30 s | Τίτλος | *«Earth Jukebox: hear how our planet changes»* + το link |

**Εγγραφή στα Windows:** ανοίξτε τον browser και πατήστε **Win + Alt + R** (Xbox Game Bar). Γράφει το παράθυρο
**μαζί με τον ήχο**. Ξαναπατήστε το για να σταματήσει. Εναλλακτικά υπάρχει το **OBS Studio** (δωρεάν).
**Ελέγξτε ότι ακούγεται ο ήχος στο video!** Ανεβάστε το στο YouTube ως *Unlisted* και βάλτε το link στη φόρμα.

### 3. Φόρμα υποβολής
spaceappschallenge.org → η σελίδα της ομάδας → **Project**. Παρακάτω υπάρχουν έτοιμα κείμενα στα αγγλικά.
Τα πεδία ίσως λέγονται λίγο αλλιώς, οπότε προσαρμόστε τα. **Υποβάλετε νωρίς**, γιατί μπορείτε να διορθώσετε
μέχρι να κλείσει η προθεσμία.

### 4. Έλεγχος πριν την υποβολή
- [ ] Το link της εφαρμογής ανοίγει σε **κινητό και laptop** και το Play παίζει.
- [ ] Το video έχει ήχο και ανοίγει χωρίς login.
- [ ] Στη φόρμα υπάρχουν τα links: εφαρμογή, repo, video.
- [ ] Το πεδίο για τη χρήση AI (αν υπάρχει) είναι συμπληρωμένο **ειλικρινά**.

### Αν περισσέψει χρόνος (προαιρετικά, με αυτή τη σειρά)
1. **Ασφάλεια (Panagiotis, 5 λεπτά):** Settings → Advanced Security → **Enable** στα: Private vulnerability
   reporting, Dependency graph, Dependabot alerts, Dependabot security updates, Code scanning → CodeQL → Default,
   Secret Protection + Push protection. Είναι δωρεάν τώρα που το repo είναι public. Δεν είναι υποχρεωτικό.
2. **Δεύτερο dataset:** μόνο αν προλαβαίνετε πριν τις 14:00. Αντιγράψτε το `tools/build_nightlights.py`,
   αλλάξτε τα URLs και τις χρονιές, και προσθέστε επιλογή στο «Choose a map».

**Μετά τις 15:00 μόνο μικρές διορθώσεις.** Μετά από κάθε push περιμένετε 2 λεπτά και ανοίξτε το link να δείτε
ότι δουλεύει. Αν κάτι χαλάσει, γυρίστε στην τελευταία καλή έκδοση με `git revert HEAD` και `git push`.

## Έτοιμα κείμενα για τη φόρμα (αγγλικά)

**Project name:** Earth Jukebox

**High-level summary**

> Earth Jukebox turns NASA Earth visualizations into sound, so blind and low-vision people can hear how our
> planet changes. Each map is played as a sweep from west (left ear) to east (right ear): pitch tells you north
> or south, and loudness tells you how much. It opens on NASA's Black Marble night lights for 2012–2023, so you
> can hear the world light up year by year, with a dip in 2020. A "hear only the change" mode plays 2023 minus
> 2012 in one sweep, with a clean tone where lights appeared and a low buzz where they faded. A voice then names
> the places that changed most: lights grew near China, the Middle East and India, and dimmed in western Europe.
> It works with a keyboard and screen reader, in any browser, with nothing to install.

**Project details**

> *What it does.* Earth Jukebox is a web app that sonifies map frames from NASA's Earth Information Center.
> It reads every pixel back into a data value (using the map's colormap, an uploaded colorbar, or brightness),
> splits the map into 12 latitude bands tuned to a pentatonic scale, and sweeps across it in stereo, so where
> something is and how much of it there is can both be heard. Values are scaled the same way across all frames,
> so changes over time stay audible, and a rising or falling chime marks whether each new frame went up or down.
> In "hear only the change" mode it plays the difference between the last and first frame in a single sweep,
> using two clearly different sounds for increases and decreases, and names the regions that changed most.
>
> *Accessibility.* Everything works from the keyboard (Space, arrows, D to describe, L for a listening guide,
> C to switch modes), with a screen reader or the built-in voice. Descriptions give numbers, percentages
> and place names. Uploaded images never leave the browser.
>
> *How we built it.* HTML, CSS and JavaScript with the Web Audio API and the Web Speech API, hosted on GitHub
> Pages. A Python tool (NumPy, OpenCV, Pillow) does the same from the command line, writing a WAV file and a
> text description, and builds the night lights preset from NASA's original 8K frames.
>
> *Why it matters.* Most Earth science is shared as pictures. Sound lets people who can't see those pictures
> notice where the Earth is changing, and it gives sighted people a second way to notice it.

**NASA data**

> Night lights 2012–2023: NASA Black Marble yearly composites, NASA Scientific Visualization Studio,
> https://svs.gsfc.nasa.gov/5276/ (as used in the Earth Information Center, https://svs.gsfc.nasa.gov/5313/).

**Use of AI** *(ΠΡΟΣΧΕΔΙΟ: διορθώστε το ώστε να λέει ακριβώς πώς δουλέψατε)*

> We used an AI coding assistant to help write, debug and test parts of the web app, the Python tools and the
> documentation. The team chose the approach and the data, reviewed the changes and tested the app.
> No AI-generated images, video or audio are used: all sounds are generated live in the browser from NASA data,
> and the maps are NASA's own.

**Links:** app https://panagiotis676.github.io/nasa-app-hackathon/ · code https://github.com/Panagiotis676/nasa-app-hackathon · video: *(το link του YouTube)*

## Τι έγινε μέχρι τώρα (13–14/11)

- Το web app βγήκε από το zip, απέκτησε **νέα εμφάνιση** (σκοτεινό και ανοιχτό θέμα, δουλεύει και σε κινητό)
  και χωρίστηκε σε `index.html`, `css/style.css` και `js/app.js`.
- Προστέθηκαν τα **αληθινά δεδομένα NASA** (night lights 2012–2023), που ανοίγουν αυτόματα.
- Διορθώθηκαν τα σημεία όπου η αλλαγή **δεν ακουγόταν**: κανονικοποίηση έντασης, πολύ σκοτεινοί χάρτες,
  ένα «ντινγκ» που έλεγε πάντα «about the same», αριθμοί που έβγαιναν «0.00».
- Προστέθηκαν: ανέβασμα colorbar, κόψιμο περιθωρίων (trim), ποσοστά στις περιγραφές, ονόματα περιοχών.
- **Panagiotis:** λίστα ανεβασμένων εικόνων (προσθέτεις σε δόσεις, αφαιρείς), **αυτόματος εντοπισμός της κλίμακας**
  μέσα στις εικόνες, και το Describe σταματάει τον ήχο για να ακουστεί η περιγραφή.
- Το Play σταματάει τη φωνή και ξεκινάει τον ήχο αμέσως. Η φωνή λέει τη χρονιά και την ώρα που παίζει.
- **Νέο design** «κέντρου ελέγχου»: διαστημικό φόντο, κουμπιά χρονιάς κάτω από τον χάρτη, μετρητής των 12 λωρίδων
  δίπλα στον χάρτη, ένδειξη γεωγραφικού μήκους, υπόμνημα ήχων και κουμπί «Light theme» για όποιον θέλει φωτεινή οθόνη.
  Για το video: ο μετρητής και ο χρυσός/μπλε χάρτης στο «Only what changed» φαίνονται πολύ ωραία.
- Οι αριθμοί για τα φώτα βγαίνουν πλέον **ακριβείς** (μέσος όρος όλων των pixels): πριν, ο browser «πηδούσε»
  pixels και έβγαζε π.χ. ψεύτικη πτώση το 2015.
- Το **Pause** σταματάει και τη φωνή.
- Νέα λειτουργία **«Only what changed»**.
- Οργάνωση του repo (`media/`, `prototype/`, `requirements.txt`), `SECURITY.md`. Το Dependabot (αυτόματα PR για νέες
  εκδόσεις πακέτων) βγήκε, γιατί έκανε μόνο θόρυβο στο hackathon και πρότεινε εκδόσεις που δεν δουλεύουν σε Python 3.9.
- Repo **public** και **GitHub Pages** ενεργά.

## Κανόνες για το git (για να μη χαθεί δουλειά)

1. **Πάντα `git pull` πριν ξεκινήσεις** να αλλάζεις κάτι, και ξανά πριν το push.
2. **Αν βγει conflict, μην κρατήσεις απλώς το δικό σου αρχείο.** Έτσι χάθηκαν το Σάββατο το «Only what changed»
   και διορθώσεις στο `image_describer.py`, και χρειάστηκε να τα ενώσουμε ξανά. Κράτα και τις δύο αλλαγές, ή ρώτα.
3. **Μην ανεβάζεις** `__pycache__/`, `.pt` μοντέλα, κατεβασμένα video ή αρχεία που βγάζουν τα scripts.
   Το `.gitignore` τα κρύβει πλέον. Οι εικόνες και οι ήχοι που θέλουμε στο repo μπαίνουν στο `media/`.
4. Μικρά commits με τίτλο που λέει τι άλλαξε.

## Για όποιον αλλάξει κώδικα (ή για το AI του)

| Αρχείο | Τι έχει |
|---|---|
| `index.html` | Η σελίδα (μόνο HTML). |
| `css/style.css` | Εμφάνιση. Τα χρώματα είναι στην αρχή, πρώτα το ανοιχτό θέμα και μετά το σκοτεινό. |
| `js/app.js` | Όλη η λογική. `decode` χρώμα → τιμή, `mkFrame` ήχος ενός frame, `mkChange` η λειτουργία «what changed», `describe` / `describeChange` τα κείμενα της φωνής, `REGIONS` ονόματα περιοχών, `initAudio` / `tick` ο ήχος, `rebuild` ξαναφτιάχνει τα frames, `usePreset` φορτώνει έτοιμο χάρτη. |
| `data/nightlights.js` | Τα 12 χρόνια ως εικόνες. Φτιάχνεται από το `tools/build_nightlights.py`, μην το αλλάζετε με το χέρι. |
| `image_describer.py` | Η ίδια ιδέα από τη γραμμή εντολών: εικόνες → WAV + κείμενο. |
| `prototype/`, `media/` | Η πρώτη εκδοχή και τα αρχεία της. |

- **Δοκιμή:** διπλό κλικ στο `index.html`. Δουλεύει χωρίς server.
- **Κανόνας:** οι αλλαγές του Chrysanthos έχουν σχόλια `Chrysanthos: ...`. Κρατήστε τα μεγάλα κουμπιά,
  το έντονο περίγραμμα στο focus και την υψηλή αντίθεση, γιατί είναι για άτομα με χαμηλή όραση.
- **Python:** `pip install -r requirements.txt`. Στα Windows, αν δεν βρίσκει το `python`, γράψτε `py`.

Καλή επιτυχία!
