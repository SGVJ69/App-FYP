
import { WordPair, QuizQuestion, SpellingChallenge } from "../types";
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface SentenceChallenge {
  english: string;
  kadazan: string;
  malay: string;
  distractors: string[];
}

export const STATIC_VOCABULARY: Record<string, WordPair[]> = {
  'Animals': [
    { english: 'Dog', kadazan: 'Tasu', malay: 'Anjing', example: 'Agayo ilo tasu.', exampleEnglish: 'That dog is big.', exampleMalay: 'Anjing itu besar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600' },
    { english: 'Cat', kadazan: 'Tingau', malay: 'Kucing', example: 'Tingau ku diti.', exampleEnglish: 'This is my cat.', exampleMalay: 'Ini kucing saya.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600' },
    { english: 'Horse', kadazan: 'Kuda', malay: 'Kuda', example: 'Agayo ilo kuda.', exampleEnglish: 'That horse is big.', exampleMalay: 'Kuda itu besar.', category: 'Animals', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Horse_December_2014-1.jpg' },
    { english: 'Fish', kadazan: 'Sada', malay: 'Ikan', example: 'Aso sada id taang.', exampleEnglish: 'There is no fish in the market.', exampleMalay: 'Tiada ikan di pasar.', category: 'Animals', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Oreochromis-niloticus-Nairobi.JPG/960px-Oreochromis-niloticus-Nairobi.JPG' },
    { english: 'Bird', kadazan: 'Tombolog', malay: 'Burung', example: 'Sumolimbau ih tombolog.', exampleEnglish: 'The bird is flying high.', exampleMalay: 'Burung itu terbang tinggi.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&q=80&w=600' },
    { english: 'Cow', kadazan: 'Sapi', malay: 'Lembu', example: 'Mangakan do roun o sapi.', exampleEnglish: 'The cow is eating grass.', exampleMalay: 'Lembu sedang makan rumput.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&q=80&w=600' },
    { english: 'Frog', kadazan: 'Gohung', malay: 'Katak', example: 'Tonggogot ginodi gohung diti.', exampleEnglish: 'This frog jumps far.', exampleMalay: 'Katak ini melompat jauh.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1579380656108-f98e4df8ea62?auto=format&fit=crop&q=80&w=600' },
    { english: 'Pig', kadazan: 'Vogok', malay: 'Babi', example: 'Agayo o vogok diti.', exampleEnglish: 'This pig is huge.', exampleMalay: 'Babi ini sangat besar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=600' },
    { english: 'Chicken', kadazan: 'Manuk', malay: 'Ayam', example: 'Panggulon ku ih manuk.', exampleEnglish: 'I will hit the chicken.', exampleMalay: 'Saya akan pukul ayam itu.', category: 'Animals', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg' }
  ],
  'Food': [
    { english: 'Egg', kadazan: 'Tontohu', malay: 'Telur', example: 'Mangakan zou tontohu.', exampleEnglish: 'I am eating an egg.', exampleMalay: 'Saya makan telur.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=600' },
    { english: 'Cooked Rice', kadazan: 'Nansakan', malay: 'Nasi', example: 'Aso nansakan di dogo.', exampleEnglish: 'I do not have cooked rice.', exampleMalay: 'Saya tiada nasi.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=600' },
    { english: 'Water', kadazan: 'Waig', malay: 'Air', example: 'Onuai zou waig ahuma.', exampleEnglish: 'Give me warm water.', exampleMalay: 'Beri saya air suam.', category: 'Food', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Glass_of_water.jpg/960px-Glass_of_water.jpg' },
    { english: 'Vegetable', kadazan: 'Roun', malay: 'Sayur', example: 'Amu zou mangakan roun.', exampleEnglish: 'I do not eat vegetables.', exampleMalay: 'Saya tidak makan sayur.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600' },
    { english: 'Sweet', kadazan: 'Momis', malay: 'Manis', example: 'Momis kopio kinotuan diti.', exampleEnglish: 'This vegetable is very sweet.', exampleMalay: 'Sayur ini sangat manis.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600' },
    { english: 'Banana', kadazan: 'Punti', malay: 'Pisang', example: 'Ondos ih punti omitu.', exampleEnglish: 'The ripe banana is delicious.', exampleMalay: 'Pisang masak itu sedap.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600' },
    { english: 'Milk', kadazan: 'Gatas', malay: 'Susu', example: 'Minum gatas o tanak.', exampleEnglish: 'The child drinks milk.', exampleMalay: 'Anak itu minum susu.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=600' },
    { english: 'Salt', kadazan: 'Tusi', malay: 'Garam', example: 'Pionuan ku do tusi.', exampleEnglish: 'I ask for some salt.', exampleMalay: 'Saya minta garam.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1518110168407-f37751079fc7?auto=format&fit=crop&q=80&w=600' },
    { english: 'Chili', kadazan: 'Hada', malay: 'Cili', example: 'Aagang kopio hada diti.', exampleEnglish: 'This chili is very red in color.', exampleMalay: 'Cili ini sangat merah warnanya.', category: 'Food', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Thai_peppers.jpg/960px-Thai_peppers.jpg' }
  ],
  'Numbers': [
    { english: 'One', kadazan: 'Iso', malay: 'Satu', example: 'Iso nopoh.', exampleEnglish: 'Only one.', exampleMalay: 'Satu sahaja.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/264653/ffffff?text=1&font=Playfair+Display' },
    { english: 'Two', kadazan: 'Duo', malay: 'Dua', example: 'Onuai zou duo.', exampleEnglish: 'Give me two.', exampleMalay: 'Beri saya dua.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/2a9d8f/ffffff?text=2&font=Playfair+Display' },
    { english: 'Three', kadazan: 'Tohu', malay: 'Tiga', example: 'Tohu tulun ti.', exampleEnglish: 'There are three people.', exampleMalay: 'Ada tiga orang.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e9c46a/000000?text=3&font=Playfair+Display' },
    { english: 'Four', kadazan: 'Apat', malay: 'Empat', example: 'Apat tasu ku.', exampleEnglish: 'I have four dogs.', exampleMalay: 'Saya ada empat anjing.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/f4a261/000000?text=4&font=Playfair+Display' },
    { english: 'Five', kadazan: 'Himo', malay: 'Lima', example: 'Himo tasu ku id doho.', exampleEnglish: 'I have five dogs.', exampleMalay: 'Saya mempunyai lima anjing.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/1d3557/ffffff?text=5&font=Playfair+Display' },
    { english: 'Six', kadazan: 'Onom', malay: 'Enam', example: 'Onom o wulan no.', exampleEnglish: 'It has been six months.', exampleMalay: 'Sudah enam bulan.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/457b9d/ffffff?text=6&font=Playfair+Display' },
    { english: 'Seven', kadazan: 'Turu', malay: 'Tujuh', example: 'Turu o bungan.', exampleEnglish: 'Seven flowers.', exampleMalay: 'Tujuh kuntum bunga.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/a8dadc/1d3557?text=7&font=Playfair+Display' },
    { english: 'Eight', kadazan: 'Wahu', malay: 'Lapan', example: 'Wahu o manuk.', exampleEnglish: 'Eight chickens.', exampleMalay: 'Lapan ekor ayam.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/f1faee/1d3557?text=8&font=Playfair+Display' },
    { english: 'Ten', kadazan: 'Hopod', malay: 'Sepuluh', example: 'Hopod tulun.', exampleEnglish: 'Ten people.', exampleMalay: 'Sepuluh orang.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e76f51/ffffff?text=10&font=Playfair+Display' }
  ],
  'Phrases': [
    { english: 'Thank you', kadazan: 'Kotohuadan', malay: 'Terima kasih', example: 'Kotohuadan kio.', exampleEnglish: 'Thank you very much.', exampleMalay: 'Terima kasih banyak-banyak.', category: 'Phrases', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/US_ambassador_Kamala_Shirin_Lakhdhir_with_Kaamatan_pageants_during_a_visit_to_Likas_Hospital_of_Sabah.jpg/960px-US_ambassador_Kamala_Shirin_Lakhdhir_with_Kaamatan_pageants_during_a_visit_to_Likas_Hospital_of_Sabah.jpg' },
    { english: 'Welcome', kadazan: 'Kopivosian', malay: 'Selamat datang', example: 'Kopivosian id sodopon.', exampleEnglish: 'Welcome to tonight.', exampleMalay: 'Selamat datang malam ini.', category: 'Phrases', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/KAAMATAN_15.jpg/960px-KAAMATAN_15.jpg' },
    { english: 'Good morning', kadazan: 'Kopivosian doungosuab', malay: 'Selamat pagi', example: 'Kopivosian doungosuab songian.', exampleEnglish: 'Good morning everyone.', exampleMalay: 'Selamat pagi semua.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=600' },
    { english: 'Good night', kadazan: 'Kopivosian doungosodop', malay: 'Selamat malam', example: 'Kopivosian doungosodop tambalut.', exampleEnglish: 'Good night, friend.', exampleMalay: 'Selamat malam, kawan.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=600' },
    { english: 'How are you?', kadazan: 'Poingkuro ko?', malay: 'Apa khabar?', example: 'Poingkuro ko baino?', exampleEnglish: 'How are you today?', exampleMalay: 'Apa khabar hari ini?', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=600' },
    { english: 'Don\'t cry', kadazan: 'Ada mihad', malay: 'Jangan nangis', example: 'Ada mihad, tanak tonini.', exampleEnglish: 'Don\'t cry, little child.', exampleMalay: 'Jangan menangis, anak kecil.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&q=80&w=600' },
    { english: 'Sorry', kadazan: 'Siou', malay: 'Maaf', example: 'Siou kio, amu ku nobowoi.', exampleEnglish: 'Sorry, I did not bring it.', exampleMalay: 'Maaf, saya tidak bawa.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=600' },
    { english: 'I love you', kadazan: 'Langad zou dia', malay: 'Saya sayang awak', example: 'Langad zou dia kopio.', exampleEnglish: 'I love you so much.', exampleMalay: 'Saya sangat sayang awak.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600' }
  ],
  'Nature': [
    { english: 'Sun', kadazan: 'Tadau', malay: 'Matahari', example: 'Pana kinohodion tadau.', exampleEnglish: 'The sun is hot today.', exampleMalay: 'Matahari panas hari ini.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sun_icon%2C_yellow.svg/1024px-Sun_icon%2C_yellow.svg.png' },
    { english: 'Moon', kadazan: 'Vuhan', malay: 'Bulan', example: 'Avang kopio ih vuhan.', exampleEnglish: 'The moon is very bright.', exampleMalay: 'Bulan itu sangat terang.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/960px-FullMoon2010.jpg' },
    { english: 'River', kadazan: 'Bawang', malay: 'Sungai', example: 'Agayo Bawang Penampang.', exampleEnglish: 'Penampang River is big.', exampleMalay: 'Sungai Penampang besar.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Kinabatangan_River_%2814154417142%29.jpg/960px-Kinabatangan_River_%2814154417142%29.jpg' },
    { english: 'Rain', kadazan: 'Rasam', malay: 'Hujan', example: 'Apana ih rasam.', exampleEnglish: 'The rain is heavy.', exampleMalay: 'Hujan sangat lebat.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&q=80&w=600' },
    { english: 'Star', kadazan: 'Rombituon', malay: 'Bintang', example: 'Aranyau o rombituon sodopon.', exampleEnglish: 'The star is shiny tonight.', exampleMalay: 'Bintang itu bersinar malam ini.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&q=80&w=600' },
    { english: 'Flower', kadazan: 'Tusak', malay: 'Bunga', example: 'Aranyat o tusak diti.', exampleEnglish: 'This flower smells beautiful.', exampleMalay: 'Bunga ini berbau harum.', category: 'Nature', imageUrl: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=600' },
    { english: 'Tree', kadazan: 'Puun', malay: 'Pokok', example: 'Adalaan kawanit puun diti.', exampleEnglish: 'This tree is very tall.', exampleMalay: 'Pokok ini sangat tinggi.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Usamljeni_jasen_-_panoramio_%28cropped%29.jpg/960px-Usamljeni_jasen_-_panoramio_%28cropped%29.jpg' },
    { english: 'Mountain', kadazan: 'Nuhu', malay: 'Gunung', example: 'Nuhu Kinabalu.', exampleEnglish: 'Mount Kinabalu.', exampleMalay: 'Gunung Kinabalu.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg/960px-Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg' }
  ],
  'Family': [
    { english: 'Father', kadazan: 'Ama', malay: 'Bapa', example: 'Mongoi zou id ama ku.', exampleEnglish: 'I am going to my father.', exampleMalay: 'Saya pergi ke bapa saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?auto=format&fit=crop&q=80&w=600' },
    { english: 'Mother', kadazan: 'Ina', malay: 'Ibu', example: 'Koupusan ku ih ina ku.', exampleEnglish: 'I love my mother.', exampleMalay: 'Saya sayang ibu saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=600' },
    { english: 'Child', kadazan: 'Tanak', malay: 'Anak', example: 'Totoloo nodi ih tanak.', exampleEnglish: 'The child is crying.', exampleMalay: 'Anak itu menangis.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=600' },
    { english: 'Elder sibling', kadazan: 'Aka', malay: 'Kakak/Abang', example: 'Mongoi i aka ku id sikul.', exampleEnglish: 'My elder sibling is going to school.', exampleMalay: 'Kakak/Abang saya pergi ke sekolah.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=600' },
    { english: 'Younger sibling', kadazan: 'Adi', malay: 'Adik', example: 'Sumoisik ih adi ku baino.', exampleEnglish: 'My younger sibling is laughing today.', exampleMalay: 'Adik saya ketawa hari ini.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1510154221590-ff63e90a136f?auto=format&fit=crop&q=80&w=600' },
    { english: 'Friend', kadazan: 'Tambalut', malay: 'Kawan', example: 'Koupusan ku tambalut ku.', exampleEnglish: 'I love my friend.', exampleMalay: 'Saya sayang kawan saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=600' },
    { english: 'Sibling', kadazan: 'Tobpinai', malay: 'Keluarga/Adik-beradik', example: 'Kotiop tobpinai ku diti.', exampleEnglish: 'My siblings are many.', exampleMalay: 'Adik-beradik saya ramai.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1510154221590-ff63e90a136f?auto=format&fit=crop&q=80&w=600' },
    { english: 'Grandparent', kadazan: 'Odu', malay: 'Nenek/Datuk', example: 'Minsoi odu id kampung.', exampleEnglish: 'Grandparent went to the village.', exampleMalay: 'Nenek ke kampung.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1626315869436-d68aeb165eed?auto=format&fit=crop&q=80&w=600' }
  ]
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

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  if (audioCache.has(text)) {
    return audioCache.get(text);
  }
  if (fetchPromiseCache.has(text)) {
    return fetchPromiseCache.get(text);
  }
  
  const promise = (async () => {
    try {
      const response = await fetch("/api/speech", {
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

export const translateWithAIDictionary = async (text: string): Promise<WordPair & { explanation: string; success: boolean }> => {
  try {
    const response = await fetch("/api/translate", {
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
    explanation: 'Could not fetch live translation at the moment. Please verify your connection or try again.',
    success: false
  };
};
