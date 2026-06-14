
import { WordPair, QuizQuestion, SpellingChallenge } from "../types";
import { db } from '../firebase';
import { GLOSBE_OFFLINE_DICTIONARY } from '../data/glosbeOfflineDictionary';
import { doc, getDoc } from 'firebase/firestore';
import preGeneratedAudio from '../data/preGeneratedAudio.json';

export interface SentenceChallenge {
  english: string;
  kadazan: string;
  malay: string;
  distractors: string[];
}

const STATIC_VOCABULARY_BASE: Record<string, WordPair[]> = {
  'Animals': [
    { english: 'Dog', kadazan: 'Tasu', malay: 'Anjing', example: 'Agayo ilo tasu.', exampleEnglish: 'That dog is big.', exampleMalay: 'Anjing itu besar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /tah-suh/. In Kadazan culture, dogs are valuable companions frequently kept in Kampungs (villages) for guarding houses and farms.' },
    { english: 'Cat', kadazan: 'Tingau', malay: 'Kucing', example: 'Tingau ku diti.', exampleEnglish: 'This is my cat.', exampleMalay: 'Ini kucing saya.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /tee-ngow/. A standard coastal Kadazan term for cat, sharing similarities with standard Dusun words.' },
    { english: 'Horse', kadazan: 'Kuda', malay: 'Kuda', example: 'Agayo ilo kuda.', exampleEnglish: 'That horse is big.', exampleMalay: 'Kuda itu besar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /ku-dah/ (similar to Malay). Horses in Sabah are traditionally associated with the Bajau "Cowboys of the East", and recognized in Kadazan trade histories.' },
    { english: 'Fish', kadazan: 'Sada', malay: 'Ikan', example: 'Aso sada id taang.', exampleEnglish: 'There is no fish in the market.', exampleMalay: 'Tiada ikan di pasar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a02?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /sah-dah/. A crucial ingredient in traditional Kadazan cuisine, particularly in preserved fish dishes like "Bosou" or "Noonsom".' },
    { english: 'Bird', kadazan: 'Tombolog', malay: 'Burung', example: 'Sumolimbau ih tombolog.', exampleEnglish: 'The bird is flying high.', exampleMalay: 'Burung itu terbang tinggi.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /tom-boh-log/. Bornean birds hold deep mythological importance in indigenous tales of wisdom.' },
    { english: 'Cow', kadazan: 'Sapi', malay: 'Lembu', example: 'Mangakan do roun o sapi.', exampleEnglish: 'The cow is eating grass.', exampleMalay: 'Lembu sedang makan rumput.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /sah-pee/. Sapi is widely used in Sabah to describe both cows and cattle roaming local farming valleys.' },
    { english: 'Frog', kadazan: 'Gohung', malay: 'Katak', example: 'Tonggogot ginodi gohung diti.', exampleEnglish: 'This frog jumps far.', exampleMalay: 'Katak ini melompat jauh.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1579380656108-f98e4df8ea62?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /goh-hung/. Gohung is often heard singing in wet paddy meadows during the rich rainy seasons.' },
    { english: 'Pig', kadazan: 'Vogok', malay: 'Babi', example: 'Agayo o vogok diti.', exampleEnglish: 'This pig is huge.', exampleMalay: 'Babi ini sangat besar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /voh-gok/. Pigs hold historical, ceremonial, and culinary significance in traditional non-Muslim Kadazan rituals.' },
    { english: 'Chicken', kadazan: 'Manuk', malay: 'Ayam', example: 'Panggulon ku ih manuk.', exampleEnglish: 'I will hit the chicken.', exampleMalay: 'Saya akan pukul ayam itu.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /mah-nook/. Reared commonly in domestic yards and a staple protein source in indigenous Kadazan gatherings.' },
    { english: 'Buffalo', kadazan: 'Karabau', malay: 'Kerbau', example: 'Kodingo o karabau id natad.', exampleEnglish: 'The buffalo is in the field.', exampleMalay: 'Kerbau itu ada di padang.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1505187213454-e053a7b545db?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /kah-rah-bow/. Buffaloes are a proud symbol of Kadazandusun wealth and were historically used to plough rice paddies.' },
    { english: 'Monkey', kadazan: 'Kara', malay: 'Monyet', example: 'Mopoitig kara id puun punti.', exampleEnglish: 'The monkey climbs the banana tree.', exampleMalay: 'Monyet memanjat pokok pisang.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /kah-rah/. Refers to the playful monkeys frequently found in Sabah\'s pristine tropical mangrove jungles.' }
  ],
  'Food': [
    { english: 'Egg', kadazan: 'Tontohu', malay: 'Telur', example: 'Mangakan zou tontohu.', exampleEnglish: 'I am eating an egg.', exampleMalay: 'Saya makan telur.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /ton-toh-hoo/.' },
    { english: 'Cooked Rice', kadazan: 'Nansakan', malay: 'Nasi', example: 'Aso nansakan di dogo.', exampleEnglish: 'I do not have cooked rice.', exampleMalay: 'Saya tiada nasi.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /nan-sah-kan/. "Nansakan" refers specifically to rice that is already cooked/prepared, highlighting the rich rice-farming heritage.' },
    { english: 'Water', kadazan: 'Waig', malay: 'Air', example: 'Onuai zou waig ahuma.', exampleEnglish: 'Give me warm water.', exampleMalay: 'Beri saya air suam.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1548839133-9fa0a41033e1?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /why-g/. Crucial word for daily requests. "Waig ahuma" refers to warm drinking water.' },
    { english: 'Vegetable', kadazan: 'Roun', malay: 'Sayur', example: 'Amu zou mangakan roun.', exampleEnglish: 'I do not eat vegetables.', exampleMalay: 'Saya tidak makan sayur.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /row-oon/. Derived from the local word for leaf, because leafy greens dominate indigenous meals.' },
    { english: 'Sweet', kadazan: 'Momis', malay: 'Manis', example: 'Momis kopio kinotuan diti.', exampleEnglish: 'This vegetable is very sweet.', exampleMalay: 'Sayur ini sangat manis.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /moh-mees/. Root word is "omis" (sweet).' },
    { english: 'Banana', kadazan: 'Punti', malay: 'Pisang', example: 'Ondos ih punti omitu.', exampleEnglish: 'The ripe banana is delicious.', exampleMalay: 'Pisang masak itu sedap.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /poon-tee/. A common Bornean fruit grown in many home gardens.' },
    { english: 'Milk', kadazan: 'Gatas', malay: 'Susu', example: 'Minum gatas o tanak.', exampleEnglish: 'The child drinks milk.', exampleMalay: 'Anak itu minum susu.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /gah-tahs/. Related to standard Malay "getah", referring locally to dairy milk.' },
    { english: 'Salt', kadazan: 'Tusi', malay: 'Garam', example: 'Pionuan ku do tusi.', exampleEnglish: 'I ask for some salt.', exampleMalay: 'Saya minta garam.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1518110168407-f37751079fc7?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /too-see/. Essential seasoning for standard preservation of meats and fruits.' },
    { english: 'Chili', kadazan: 'Hada', malay: 'Cili', example: 'Aagang kopio hada diti.', exampleEnglish: 'This chili is very red in color.', exampleMalay: 'Cili ini sangat merah warnanya.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /hah-dah/. A fiery spice ubiquitous in Sabahan diets and side dips.' },
    { english: 'Papaya', kadazan: 'Pontos', malay: 'Betik', example: 'Mangakan zou do pontos.', exampleEnglish: 'I am eating papaya.', exampleMalay: 'Saya makan betik.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1517431345437-548777121703?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /pon-tos/. A local backyard crop eaten fresh.' }
  ],
  'Numbers': [
    { english: 'One', kadazan: 'Iso', malay: 'Satu', example: 'Iso nopoh.', exampleEnglish: 'Only one.', exampleMalay: 'Satu sahaja.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/264653/ffffff?text=1&font=Playfair+Display', explanation: 'Pronounced as /ee-soh/. Crucial baseline number.' },
    { english: 'Two', kadazan: 'Duo', malay: 'Dua', example: 'Onuai zou duo.', exampleEnglish: 'Give me two.', exampleMalay: 'Beri saya dua.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/2a9d8f/ffffff?text=2&font=Playfair+Display', explanation: 'Pronounced as /doo-oh/.' },
    { english: 'Three', kadazan: 'Tohu', malay: 'Tiga', example: 'Tohu tulun ti.', exampleEnglish: 'There are three people.', exampleMalay: 'Ada tiga orang.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e9c46a/000000?text=3&font=Playfair+Display', explanation: 'Pronounced as /toh-hoo/.' },
    { english: 'Four', kadazan: 'Apat', malay: 'Empat', example: 'Apat tasu ku.', exampleEnglish: 'I have four dogs.', exampleMalay: 'Saya ada empat anjing.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/f4a261/000000?text=4&font=Playfair+Display', explanation: 'Pronounced as /ah-paht/.' },
    { english: 'Five', kadazan: 'Himo', malay: 'Lima', example: 'Himo tasu ku id doho.', exampleEnglish: 'I have five dogs.', exampleMalay: 'Saya mempunyai lima anjing.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/1d3557/ffffff?text=5&font=Playfair+Display', explanation: 'Pronounced as /hee-moh/.' },
    { english: 'Six', kadazan: 'Onom', malay: 'Enam', example: 'Onom o wulan no.', exampleEnglish: 'It has been six months.', exampleMalay: 'Sudah enam bulan.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/457b9d/ffffff?text=6&font=Playfair+Display', explanation: 'Pronounced as /oh-nom/.' },
    { english: 'Seven', kadazan: 'Turu', malay: 'Tujuh', example: 'Turu o bungan.', exampleEnglish: 'Seven flowers.', exampleMalay: 'Tujuh kuntum bunga.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/a8dadc/1d3557?text=7&font=Playfair+Display', explanation: 'Pronounced as /too-roo/.' },
    { english: 'Eight', kadazan: 'Wahu', malay: 'Lapan', example: 'Wahu o manuk.', exampleEnglish: 'Eight chickens.', exampleMalay: 'Lapan ekor ayam.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/f1faee/1d3557?text=8&font=Playfair+Display', explanation: 'Pronounced as /wah-hoo/. The "h" is clearly pronounced.' },
    { english: 'Nine', kadazan: 'Siyam', malay: 'Sembilan', example: 'Siyam o tulun nongoi.', exampleEnglish: 'Nine people went.', exampleMalay: 'Sembilan orang pergi.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e76f51/ffffff?text=9&font=Playfair+Display', explanation: 'Pronounced /see-yahm/.' },
    { english: 'Ten', kadazan: 'Hopod', malay: 'Sepuluh', example: 'Hopod tulun.', exampleEnglish: 'Ten people.', exampleMalay: 'Sepuluh orang.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e76f51/ffffff?text=10&font=Playfair+Display', explanation: 'Pronounced as /hoh-pod/. Indicates completion of a counting scale.' }
  ],
  'Phrases': [
    { english: 'Thank you', kadazan: 'Kotohuadan', malay: 'Terima kasih', example: 'Kotohuadan kio.', exampleEnglish: 'Thank you very much.', exampleMalay: 'Terima kasih banyak-banyak.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /koh-toh-hoo-ah-dahn/. The most sacred polite saying in Kadazan.' },
    { english: 'Welcome', kadazan: 'Kopivosian', malay: 'Selamat datang / Hello', example: 'Kopivosian id sodopon.', exampleEnglish: 'Welcome to tonight.', exampleMalay: 'Selamat datang malam ini.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1496150590317-f8d992167e8f?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /koh-pee-voh-see-ahn/. Used universally as a greeting, hello, or warm welcome.' },
    { english: 'Good morning', kadazan: 'Kopivosian doungosuab', malay: 'Selamat pagi', example: 'Kopivosian doungosuab songian.', exampleEnglish: 'Good morning everyone.', exampleMalay: 'Selamat pagi semua.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=600', explanation: 'Combination of "Kopivosian" (wellness/greeting) and "doungosuab" (in the morning).' },
    { english: 'Good night', kadazan: 'Kopivosian doungosodop', malay: 'Selamat malam', example: 'Kopivosian doungosodop tambalut.', exampleEnglish: 'Good night, friend.', exampleMalay: 'Selamat malam, kawan.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=600', explanation: 'Derived from "Kopivosian" and "doungosodop" (at night).' },
    { english: 'How are you?', kadazan: 'Poingkuro ko?', malay: 'Apa khabar?', example: 'Poingkuro ko baino?', exampleEnglish: 'How are you today?', exampleMalay: 'Apa khabar hari ini?', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=600', explanation: '"Poingkuro" translates literally to "how", and "ko" is the pronoun for "you".' },
    { english: 'Don\'t cry', kadazan: 'Ada mihad', malay: 'Jangan nangis', example: 'Ada mihad, tanak tonini.', exampleEnglish: 'Don\'t cry, little child.', exampleMalay: 'Jangan menangis, anak kecil.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&q=80&w=600', explanation: 'Formed from "Ada" (Do not) and "mihad" (to weep/cry).' },
    { english: 'Sorry', kadazan: 'Siou', malay: 'Maaf', example: 'Siou kio, amu ku nobowoi.', exampleEnglish: 'Sorry, I did not bring it.', exampleMalay: 'Maaf, saya tidak bawa.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=600', explanation: '/see-oh/. A simple, friendly expression to display remorse or beg forgiveness.' },
    { english: 'I love you', kadazan: 'Langad zou dia', malay: 'Saya sayang awak', example: 'Langad zou dia kopio.', exampleEnglish: 'I love you so much.', exampleMalay: 'Saya sangat sayang awak.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600', explanation: 'Often expressed via "langad" (longing) or directly "koupusan zou dia" (I cherish you).' },
    { english: 'Yes', kadazan: 'Oo', malay: 'Ya', example: 'Oo, ouhan iti.', exampleEnglish: 'Yes, this is easy.', exampleMalay: 'Ya, ini mudah.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as a quick nasal /oh-oh/.' },
    { english: 'No', kadazan: 'Amu', malay: 'Tidak', example: 'Amu, amu zou mongoi sikul.', exampleEnglish: 'No, I am not going to school.', exampleMalay: 'Tidak, saya tidak pergi sekolah.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=600', explanation: '/ah-moo/. Negates sentences and expresses disagreement.' },
    { english: 'Goodbye / Go first', kadazan: 'Mongoi no ku', malay: 'Saya pergi dulu', example: 'Mongoi no ku, siou kio.', exampleEnglish: 'I will go first, goodbye.', exampleMalay: 'Saya jalan dulu ya.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /mo-ngoy noh koo/. Standard polite parting phrase.' }
  ],
  'Nature': [
    { english: 'Sun', kadazan: 'Tadau', malay: 'Matahari', example: 'Pana kinohodion tadau.', exampleEnglish: 'The sun is hot today.', exampleMalay: 'Matahari panas hari ini.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced as /tah-dow/. "Tadau" also translates to "day" in Kadazan.' },
    { english: 'Moon', kadazan: 'Vuhan', malay: 'Bulan', example: 'Avang kopio ih vuhan.', exampleEnglish: 'The moon is very bright.', exampleMalay: 'Bulan itu sangat terang.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /voo-hahn/. "Vuhan" is also the word for "month".' },
    { english: 'River', kadazan: 'Bawang', malay: 'Sungai', example: 'Agayo Bawang Penampang.', exampleEnglish: 'Penampang River is big.', exampleMalay: 'Sungai Penampang besar.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /bah-wahng/. Penampang districts flow around key rivers vital to trade.' },
    { english: 'Rain', kadazan: 'Rasam', malay: 'Hujan', example: 'Apana ih rasam.', exampleEnglish: 'The rain is heavy.', exampleMalay: 'Hujan sangat lebat.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /rah-sahm/. Daily monsoons play a crucial role in Bornean agriculture.' },
    { english: 'Star', kadazan: 'Rombituon', malay: 'Bintang', example: 'Aranyau o rombituon sodopon.', exampleEnglish: 'The star is shiny tonight.', exampleMalay: 'Bintang itu bersinar malam ini.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /rom-bee-too-ohn/. Indigenous travelers historically navigated rainforests observing starlight.' },
    { english: 'Flower', kadazan: 'Tusak', malay: 'Bunga', example: 'Aranyat o tusak diti.', exampleEnglish: 'This flower smells beautiful.', exampleMalay: 'Bunga ini berbau harum.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /too-sahk/.' },
    { english: 'Tree', kadazan: 'Puun', malay: 'Pokok', example: 'Adalaan kawanit puun diti.', exampleEnglish: 'This tree is very tall.', exampleMalay: 'Pokok ini sangat tinggi.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /poo-oon/. A root noun that also refers to beginnings or primary roots.' },
    { english: 'Mountain', kadazan: 'Nuhu', malay: 'Gunung', example: 'Nuhu Kinabalu.', exampleEnglish: 'Mount Kinabalu.', exampleMalay: 'Gunung Kinabalu.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /noo-hoo/. Mount Kinabalu (Nuhu Nabalu) is the sacred resting place of ancestral spirits in indigenous belief.' }
  ],
  'Family': [
    { english: 'Father', kadazan: 'Ama', malay: 'Bapa', example: 'Mongoi zou id ama ku.', exampleEnglish: 'I am going to my father.', exampleMalay: 'Saya pergi ke bapa saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /ah-mah/.' },
    { english: 'Mother', kadazan: 'Ina', malay: 'Ibu', example: 'Koupusan ku ih ina ku.', exampleEnglish: 'I love my mother.', exampleMalay: 'Saya sayang ibu saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /ee-nah/.' },
    { english: 'Child', kadazan: 'Tanak', malay: 'Anak', example: 'Totoloo nodi ih tanak.', exampleEnglish: 'The child is crying.', exampleMalay: 'Anak itu menangis.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /tah-nahk/.' },
    { english: 'Elder sibling', kadazan: 'Aka', malay: 'Kakak / Abang', example: 'Mongoi i aka ku id sikul.', exampleEnglish: 'My elder sibling is going to school.', exampleMalay: 'Kakak/Abang saya pergi ke sekolah.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /ah-kah/. Used respectfully for older brothers and sisters indistinguishably.' },
    { english: 'Younger sibling', kadazan: 'Adi', malay: 'Adik', example: 'Sumoisik ih adi ku baino.', exampleEnglish: 'My younger sibling is laughing today.', exampleMalay: 'Adik saya ketawa hari ini.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1510154221590-ff63e90a136f?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /ah-dee/. Gentle pronoun for younger family members.' },
    { english: 'Friend', kadazan: 'Tambalut', malay: 'Kawan', example: 'Koupusan ku tambalut ku.', exampleEnglish: 'I love my friend.', exampleMalay: 'Saya sayang kawan saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /tahm-bah-loot/. Meaning "companion" or "mate" bound by mutual affinity.' },
    { english: 'Grandparent', kadazan: 'Odu', malay: 'Nenek / Datuk', example: 'Minsoi odu id kampung.', exampleEnglish: 'Grandparent went to the village.', exampleMalay: 'Nenek ke kampung.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&q=80&w=600', explanation: 'Pronounced /oh-doo/. Traditionally respected elders and storytellers of oral histories.' }
  ]
};

export const STATIC_VOCABULARY: Record<string, WordPair[]> = {
  ...STATIC_VOCABULARY_BASE,
  ...GLOSBE_OFFLINE_DICTIONARY
};

export const STATIC_QUIZZES: Record<string, QuizQuestion[]> = {
  'Animals': [
    { question: 'What is "Dog" in Kadazan?', options: ['Tingau', 'Tasu', 'Manuk', 'Kuda'], correctAnswer: 'Tasu', explanation: 'Tasu means Dog (Anjing).' },
    { question: 'What is "Cat" in Kadazan?', options: ['Tingau', 'Tasu', 'Sada', 'Kuda'], correctAnswer: 'Tingau', explanation: 'Tingau means Cat (Kucing).' },
    { question: 'What is "Horse" in Kadazan?', options: ['Sada', 'Tingau', 'Kuda', 'Manuk'], correctAnswer: 'Kuda', explanation: 'Kuda means Horse (Kuda).' },
    { question: 'What is "Fish" in Kadazan?', options: ['Manuk', 'Tasu', 'Tingau', 'Sada'], correctAnswer: 'Sada', explanation: 'Sada means Fish (Ikan).' },
    { question: 'What is "Bird" in Kadazan?', options: ['Tombolog', 'Sapi', 'Vogok', 'Gohung'], correctAnswer: 'Tombolog', explanation: 'Tombolog means Bird (Burung).' },
    { question: 'What is "Cow" in Kadazan?', options: ['Tasu', 'Sapi', 'Vogok', 'Kuda'], correctAnswer: 'Sapi', explanation: 'Sapi means Cow (Lembu).' },
    { question: 'What is "Frog" in Kadazan?', options: ['Gohung', 'Tombolog', 'Sada', 'Tingau'], correctAnswer: 'Gohung', explanation: 'Gohung means Frog (Katak).' },
    { question: 'What is "Pig" in Kadazan?', options: ['Vogok', 'Sapi', 'Manuk', 'Tasu'], correctAnswer: 'Vogok', explanation: 'Vogok means Pig (Babi).' }
  ],
  'Food': [
    { question: 'What is "Cooked Rice" in Kadazan?', options: ['Waig', 'Roun', 'Nansakan', 'Hada'], correctAnswer: 'Nansakan', explanation: 'Nansakan means Cooked Rice (Nasi).' },
    { question: 'What is "Water" in Kadazan?', options: ['Momis', 'Waig', 'Nansakan', 'Hada'], correctAnswer: 'Waig', explanation: 'Waig means Water (Air).' },
    { question: 'What is "Vegetable" in Kadazan?', options: ['Roun', 'Hada', 'Nansakan', 'Waig'], correctAnswer: 'Roun', explanation: 'Roun means Vegetable (Sayur).' },
    { question: 'What is "Sweet" in Kadazan?', options: ['Momis', 'Waig', 'Roun', 'Hada'], correctAnswer: 'Momis', explanation: 'Momis means Sweet (Manis).' },
    { question: 'What is "Banana" in Kadazan?', options: ['Punti', 'Gatas', 'Tusi', 'Nansakan'], correctAnswer: 'Punti', explanation: 'Punti means Banana (Pisang).' },
    { question: 'What is "Milk" in Kadazan?', options: ['Waig', 'Gatas', 'Tontohu', 'Momis'], correctAnswer: 'Gatas', explanation: 'Gatas means Milk (Susu).' },
    { question: 'What is "Salt" in Kadazan?', options: ['Tusi', 'Hada', 'Roun', 'Punti'], correctAnswer: 'Tusi', explanation: 'Tusi means Salt (Garam).' }
  ],
  'Numbers': [
    { question: 'What is "One" in Kadazan?', options: ['Duo', 'Tohu', 'Iso', 'Apat'], correctAnswer: 'Iso', explanation: 'Iso means One (Satu).' },
    { question: 'What is "Two" in Kadazan?', options: ['Iso', 'Duo', 'Apat', 'Tohu'], correctAnswer: 'Duo', explanation: 'Duo means Two (Dua).' },
    { question: 'What is "Three" in Kadazan?', options: ['Tohu', 'Duo', 'Iso', 'Apat'], correctAnswer: 'Tohu', explanation: 'Tohu means Three (Tiga).' },
    { question: 'What is "Four" in Kadazan?', options: ['Apat', 'Tohu', 'Duo', 'Iso'], correctAnswer: 'Apat', explanation: 'Apat means Four (Empat).' },
    { question: 'What is "Five" in Kadazan?', options: ['Onom', 'Himo', 'Turu', 'Wahu'], correctAnswer: 'Himo', explanation: 'Himo means Five (Lima).' },
    { question: 'What is "Six" in Kadazan?', options: ['Onom', 'Wahu', 'Hopod', 'Iso'], correctAnswer: 'Onom', explanation: 'Onom means Six (Enam).' },
    { question: 'What is "Seven" in Kadazan?', options: ['Turu', 'Himo', 'Duo', 'Tohu'], correctAnswer: 'Turu', explanation: 'Turu means Seven (Tujuh).' },
    { question: 'What is "Eight" in Kadazan?', options: ['Wahu', 'Onom', 'Apat', 'Hopod'], correctAnswer: 'Wahu', explanation: 'Wahu means Eight (Lapan).' }
  ],
  'Phrases': [
    { question: 'How do you say "Thank you" in Kadazan?', options: ['Kopivosian', 'Poingkuro ko?', 'Kotohuadan', 'Langad zou dia'], correctAnswer: 'Kotohuadan', explanation: 'Kotohuadan means Thank you (Terima kasih).' },
    { question: 'How do you say "Welcome"?', options: ['Kotohuadan', 'Kopivosian', 'Poingkuro ko?', 'Langad zou dia'], correctAnswer: 'Kopivosian', explanation: 'Kopivosian means Welcome (Selamat datang).' },
    { question: 'How do you say "How are you"?', options: ['Kopivosian doungosuab', 'Poingkuro ko?', 'Kotohuadan', 'Langad zou dia'], correctAnswer: 'Poingkuro ko?', explanation: 'Poingkuro ko? means How are you? (Apa khabar?).' },
    { question: 'How do you say "Good morning"?', options: ['Kopivosian doungosuab', 'Kotohuadan', 'Poingkuro ko?', 'Kopivosian'], correctAnswer: 'Kopivosian doungosuab', explanation: 'Kopivosian doungosuab means Good morning (Selamat pagi).' },
    { question: 'How do you say "Good night"?', options: ['Kopivosian doungosodop', 'Kopivosian doungosuab', 'Siou', 'Ada mihad'], correctAnswer: 'Kopivosian doungosodop', explanation: 'Kopivosian doungosodop means Good night (Selamat malam).' },
    { question: 'How do you say "Don\'t cry"?', options: ['Ada mihad', 'Siou', 'Kotohuadan', 'Poingkuro ko?'], correctAnswer: 'Ada mihad', explanation: 'Ada mihad means Don\'t cry (Jangan nangis).' },
    { question: 'How do you say "Sorry" in Kadazan?', options: ['Siou', 'Ada mihad', 'Langad zou dia', 'Kopivosian'], correctAnswer: 'Siou', explanation: 'Siou means Sorry (Maaf).' }
  ],
  'Nature': [
    { question: 'What is "Sun" in Kadazan?', options: ['Vuhan', 'Bawang', 'Nuhu', 'Tadau'], correctAnswer: 'Tadau', explanation: 'Tadau means Sun (Matahari).' },
    { question: 'What is "Moon" in Kadazan?', options: ['Tadau', 'Bawang', 'Vuhan', 'Puun'], correctAnswer: 'Vuhan', explanation: 'Vuhan means Moon (Bulan).' },
    { question: 'What is "River" in Kadazan?', options: ['Puun', 'Nuhu', 'Tadau', 'Bawang'], correctAnswer: 'Bawang', explanation: 'Bawang means River (Sungai).' },
    { question: 'What is "Mountain" in Kadazan?', options: ['Vuhan', 'Nuhu', 'Tadau', 'Puun'], correctAnswer: 'Nuhu', explanation: 'Nuhu means Mountain (Gunung).' },
    { question: 'What is "Rain" in Kadazan?', options: ['Rasam', 'Rombituon', 'Tusak', 'Puun'], correctAnswer: 'Rasam', explanation: 'Rasam means Rain (Hujan).' },
    { question: 'What is "Star" in Kadazan?', options: ['Rombituon', 'Vuhan', 'Tadau', 'Nuhu'], correctAnswer: 'Rombituon', explanation: 'Rombituon means Star (Bintang).' },
    { question: 'What is "Flower" in Kadazan?', options: ['Tusak', 'Puun', 'Bawang', 'Rasam'], correctAnswer: 'Tusak', explanation: 'Tusak means Flower (Bunga).' }
  ],
  'Family': [
    { question: 'What is "Father" in Kadazan?', options: ['Ina', 'Tanak', 'Ama', 'Odu'], correctAnswer: 'Ama', explanation: 'Ama means Father (Bapa).' },
    { question: 'What is "Mother" in Kadazan?', options: ['Ama', 'Tanak', 'Tobpinai', 'Ina'], correctAnswer: 'Ina', explanation: 'Ina means Mother (Ibu).' },
    { question: 'What is "Child" in Kadazan?', options: ['Odu', 'Ama', 'Tanak', 'Ina'], correctAnswer: 'Tanak', explanation: 'Tanak means Child (Anak).' },
    { question: 'What is "Grandparent" in Kadazan?', options: ['Odu', 'Tobpinai', 'Ina', 'Tanak'], correctAnswer: 'Odu', explanation: 'Odu means Grandparent (Nenek/Datuk).' },
    { question: 'What is "Elder sibling" (Kakak/Abang) in Kadazan?', options: ['Aka', 'Adi', 'Tambalut', 'Ina'], correctAnswer: 'Aka', explanation: 'Aka means Elder sibling (Kakak/Abang).' },
    { question: 'What is "Younger sibling" (Adik) in Kadazan?', options: ['Adi', 'Aka', 'Tanak', 'Tobpinai'], correctAnswer: 'Adi', explanation: 'Adi means Younger Sibling (Adik).' },
    { question: 'What is "Friend" in Kadazan?', options: ['Tambalut', 'Odu', 'Ama', 'Aka'], correctAnswer: 'Tambalut', explanation: 'Tambalut means Friend (Kawan).' }
  ]
};

export const STATIC_SENTENCES: SentenceChallenge[] = [
  { english: 'Thank you very much.', kadazan: 'Kotohuadan kio.', malay: 'Terima kasih banyak-banyak.', distractors: ['Tasu', 'Waig', 'Ama'] },
  { english: 'I have four dogs.', kadazan: 'Apat tasu ku.', malay: 'Saya ada empat anjing.', distractors: ['Tingau', 'Hada', 'Vuhan'] },
  { english: 'Penampang River is big.', kadazan: 'Agayo Bawang Penampang.', malay: 'Sungai Penampang besar.', distractors: ['Puun', 'Tadau', 'Tohu'] },
  { english: 'The child is crying.', kadazan: 'Totoloo nodi ih tanak.', malay: 'Anak itu menangis.', distractors: ['Tobpinai', 'Ama', 'Odu'] },
  { english: 'The sun is hot today.', kadazan: 'Pana kinohodion tadau.', malay: 'Matahari panas hari ini.', distractors: ['Vuhan', 'Nuhu', 'Bawang'] },
  { english: 'The moon is very bright.', kadazan: 'Avang kopio ih vuhan.', malay: 'Bulan itu sangat terang.', distractors: ['Tadau', 'Puun', 'Nuhu'] },
  { english: 'I love my mother.', kadazan: 'Koupusan ku ih ina ku.', malay: 'Saya sayang ibu saya.', distractors: ['Ama', 'Tanak', 'Tobpinai'] },
  { english: 'I have five dogs.', kadazan: 'Himo tasu ku id doho.', malay: 'Saya mempunyai lima anjing.', distractors: ['Turu', 'Punti', 'Vuhun'] },
  { english: 'The rain is heavy.', kadazan: 'Apana ih rasam.', malay: 'Hujan sangat lebat.', distractors: ['Tadau', 'Tusak', 'Adi'] },
  { english: 'I love my friend.', kadazan: 'Koupusan ku tambalut ku.', malay: 'Saya sayang kawan saya.', distractors: ['Ama', 'Aka', 'Odu'] },
  { english: 'Good night, friend.', kadazan: 'Kopivosian doungosodop tambalut.', malay: 'Selamat malam, kawan.', distractors: ['Kotohuadan', 'Siou', 'Tasu'] }
];

export const generateImage = async (prompt: string): Promise<string> => {
  return 'https://images.unsplash.com/photo-1596423736561-392d4f29d28e?auto=format&fit=crop&q=80&w=800';
};

const audioCache = new Map<string, string>();
const fetchPromiseCache = new Map<string, Promise<string | undefined>>();

// Resolve the API base URL. Use VITE_API_URL if configured (critical for APK/Webview environments),
// otherwise default to standard relative paths.
const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  // Auto-detect Android WebView/APK/Cordova offline environment and point back to the hosted target server
  if (typeof window !== 'undefined') {
    const isLocalFile = window.location.protocol === 'file:';
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Fallback if accessed inside native webviews or non-standard origin environments
    if (isLocalFile || isLocalHost || !window.location.hostname.includes('.run.app')) {
      return 'https://ais-pre-fgzmvdaplf3wzjot7ycfpj-354233764796.asia-southeast1.run.app';
    }
  }
  return '';
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const cleanKey = text.trim().toLowerCase();
  if ((preGeneratedAudio as Record<string, string>)[cleanKey]) {
    console.log(`[Offline Audio DB] Playback from pre-compiled asset: "${cleanKey}"`);
    return (preGeneratedAudio as Record<string, string>)[cleanKey];
  }

  if (audioCache.has(text)) {
    return audioCache.get(text);
  }
  if (fetchPromiseCache.has(text)) {
    return fetchPromiseCache.get(text);
  }
  
  const promise = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.base64Audio) {
        audioCache.set(text, data.base64Audio);
        return data.base64Audio;
      }
    } catch (e) {
      console.error("Gemini TTS error:", e);
    }
    return undefined;
  })();
  
  fetchPromiseCache.set(text, promise);
  
  try {
    await promise;
  } finally {
    fetchPromiseCache.delete(text);
  }
  
  return promise;
};


export const getVocabulary = async (category: string): Promise<WordPair[]> => {
  try {
     const docRef = doc(db, 'content', 'vocabulary');
     const docSnap = await getDoc(docRef);
     if (docSnap.exists()) {
       const data = docSnap.data();
       if (data[category]) {
          return data[category];
       }
     }
  } catch(e) {
     console.error('Error fetching vocabulary:', e);
  }
  return STATIC_VOCABULARY[category] || STATIC_VOCABULARY['Animals'];
};

export const getSpellingChallenge = async (excludeWord?: string): Promise<SpellingChallenge> => {
  const categories = Object.keys(STATIC_VOCABULARY).filter(cat => cat !== 'Phrases');
  
  // Collect from Firestore if available
  let allWords: WordPair[] = [];
  try {
    const docRef = doc(db, 'content', 'vocabulary');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      categories.forEach(c => {
         if (data[c]) allWords.push(...data[c]);
      });
    }
  } catch (e) {
    console.error('Error fetching spelling words:', e);
  }

  if (allWords.length === 0) {
     allWords = categories.flatMap(c => STATIC_VOCABULARY[c]);
  }

  let filteredWords = excludeWord ? allWords.filter(w => w.kadazan !== excludeWord) : allWords;
  if (filteredWords.length === 0) filteredWords = allWords; // fallback
  const word = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  return {
    english: word.english,
    kadazan: word.kadazan,
    hint: `Translation: ${word.malay}`, 
    imageUrl: word.imageUrl
  };
};

export const generateQuiz = async (category: string): Promise<QuizQuestion[]> => {
  try {
     const docRef = doc(db, 'content', 'quizzes');
     const docSnap = await getDoc(docRef);
     if (docSnap.exists()) {
       const data = docSnap.data();
       if (data[category]) {
          return data[category];
       }
     }
  } catch(e) {
      console.error('Error fetching quizzes:', e);
  }
  return STATIC_QUIZZES[category] || STATIC_QUIZZES['Animals'];
};

export const checkSentence = async (english: string, userKadazan: string): Promise<{ correct: boolean; feedback: string; correction?: string }> => {
  const challenge = STATIC_SENTENCES.find(s => s.english === english);
  const correctKadazan = challenge ? challenge.kadazan : '';
  const isCorrect = userKadazan.trim().toLowerCase().replace(/[.,!?]/g, '') === correctKadazan.toLowerCase().replace(/[.,!?]/g, '');
  
  return Promise.resolve({ 
    correct: isCorrect, 
    feedback: isCorrect ? '✅ Otopot! (Correct!)' : '❌ Ada kooti! (Not quite!)',
    correction: isCorrect ? undefined : correctKadazan
  });
};

// Re-export interface if necessary. Or remove if already defined above.
// Handled above.

export const getSentenceBuilderChallenge = async (completedCount: number = 0): Promise<SentenceChallenge> => {
  return Promise.resolve(STATIC_SENTENCES[Math.floor(completedCount / 10) % STATIC_SENTENCES.length]);
};

// Helper function to normalize words for robust fuzzy stem matching (handles plurals, verb endings, and Malay prefixes)
const normalizeWord = (w: string): string => {
  return w.toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .replace(/s$/, "")                    // Plurals (dogs -> dog)
    .replace(/ing$/, "")                  // Continuous verb (eating -> eat)
    .replace(/ed$/, "")                   // Past tense (wanted -> want)
    .replace(/^(me|mem|men|meng|ber|se|di)/, ""); // Common Malay prefixes (makan/makanan/memakan)
};

export const translateWithAIDictionary = async (text: string): Promise<WordPair & { explanation: string; success: boolean }> => {
  const query = text.toLowerCase().trim();

  // 1. Check local static vocabulary first for exact or substring matches
  const allWords = Object.entries(STATIC_VOCABULARY).flatMap(([cat, words]) =>
    words.map(w => ({ ...w, category: cat }))
  );

  // Match 1st: Exact or normalised direct match
  const normQuery = normalizeWord(query);
  const localMatch = allWords.find(
    w => w.kadazan.toLowerCase() === query ||
         w.english.toLowerCase() === query ||
         w.malay.toLowerCase() === query
  ) || allWords.find(
    w => normalizeWord(w.kadazan) === normQuery ||
         normalizeWord(w.english) === normQuery ||
         normalizeWord(w.malay) === normQuery
  ) || allWords.find(
    w => w.kadazan.toLowerCase().includes(query) ||
         w.english.toLowerCase().includes(query) ||
         w.malay.toLowerCase().includes(query)
  );

  if (localMatch) {
    return {
      ...localMatch,
      explanation: localMatch.explanation || `Standard coastal Kadazan word. Used commonly in everyday conversations in Sabah.`,
      success: true
    };
  }

  // Fallback: If it's a multi-word query, try translating word-by-word offline
  const tokens = query.split(/\s+/).map(t => t.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")).filter(t => t.length > 1);
  if (tokens.length > 1) {
    const matchedPairs: { word: string; match: WordPair }[] = [];
    for (const token of tokens) {
      const normToken = normalizeWord(token);
      const match = allWords.find(w => 
        normalizeWord(w.kadazan) === normToken ||
        normalizeWord(w.english) === normToken ||
        normalizeWord(w.malay) === normToken
      ) || allWords.find(w =>
        w.kadazan.toLowerCase().includes(token) ||
        w.english.toLowerCase().includes(token) ||
        w.malay.toLowerCase().includes(token)
      );
      if (match) {
        matchedPairs.push({ word: token, match });
      }
    }

    if (matchedPairs.length > 0) {
      const kadazanParts = matchedPairs.map(p => p.match.kadazan);
      const englishParts = matchedPairs.map(p => p.match.english);
      const malayParts = matchedPairs.map(p => p.match.malay);

      const partsExplanation = matchedPairs.map(p => `• "${p.word}" is found as "${p.match.kadazan}" (${p.match.english} / ${p.match.malay})`).join('\n');

      return {
        english: text,
        kadazan: kadazanParts.join(' '),
        malay: malayParts.join(' '),
        category: 'Offline Word Translation',
        imageUrl: 'https://images.unsplash.com/photo-1544640808-32ca72ac7f37?auto=format&fit=crop&q=80&w=600',
        explanation: `Compiled offline word-by-word:\n\n${partsExplanation}\n\nNote: If connected to the internet, you can lookup standard conversational constructs dynamically!`,
        success: true
      };
    }
  }

  // 2. If not found locally, proceed to fetch dynamically through the API server
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      throw new Error(`Failed to translate: ${response.statusText}`);
    }
    const data = await response.json();
    if (data && data.success) {
      return data;
    }
  } catch (error) {
    console.error("Dictionary translation error:", error);
  }
  return {
    english: text,
    kadazan: '',
    malay: '',
    category: 'Dynamic Translation',
    imageUrl: 'https://images.unsplash.com/photo-1544640808-32ca72ac7f37?auto=format&fit=crop&q=80&w=600',
    explanation: 'Could not fetch live translation offline. Please check your internet connection or try common words like "water", "eat", "happy", "dog", "mother" etc.',
    success: false
  };
};
