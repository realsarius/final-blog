import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pgPkg from "pg";
import { hash } from "bcryptjs";

const { PrismaClient } = prismaPkg;
const { Pool } = pgPkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const requiredEnv = [
  "ADMIN_FIRST_NAME",
  "ADMIN_LAST_NAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

function slugify(value) {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function computeReadingTime(content) {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
}

function assertEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. Update .env before seeding.`
    );
  }
}

async function main() {
  assertEnv();

  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  let admin = existing;

  if (!admin) {
    const passwordHash = await hash(process.env.ADMIN_PASSWORD, 12);
    admin = await prisma.user.create({
      data: {
        firstName: process.env.ADMIN_FIRST_NAME,
        lastName: process.env.ADMIN_LAST_NAME,
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("Admin user seeded successfully.");
  } else {
    const nextFirstName = process.env.ADMIN_FIRST_NAME;
    const nextLastName = process.env.ADMIN_LAST_NAME;
    const shouldUpdateProfile =
      admin.firstName !== nextFirstName
      || admin.lastName !== nextLastName
      || admin.role !== "ADMIN"
      || admin.isActive !== true;

    if (shouldUpdateProfile) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: {
          firstName: nextFirstName,
          lastName: nextLastName,
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log("Admin user exists. Profile synced from env.");
    } else {
      console.log("Admin user already exists and is up to date.");
    }
  }

  const seedPosts = [
    {
      title: "Işıltılı Cilt Rehberi: Basit ve Etkili Cilt Bakımı Önerileri",
      excerpt: "Karmaşık rutine girmeden temiz, nemli ve korunan bir cilt için uygulanabilir adımlar.",
      content: `Merhaba cilt bakımını sevenler! Bu yazıda, günlük hayatı zorlamadan uygulanabilecek pratik bir rutin paylaşmak istiyorum.

Temel iki adımımız net: nazik temizleme ve doğru nemlendirme. Cildi fazla arındırmak bariyeri zayıflatabilir; bu yüzden cilt tipine uygun bir temizleyici seçmek önemli. Ardından nemlendirici ile su kaybını azaltmak, cilde gün boyu konfor sağlar.

Gündüz rutininin en kritik adımı ise güneş koruyucu. Dört mevsim, geniş spektrumlu ve en az SPF 30 bir ürün kullanmak; leke, erken yaşlanma belirtileri ve UV kaynaklı hasarı azaltmaya yardımcı olur. Uzun süre dışarıdaysan gün içinde yenilemeyi unutma.

İçerik seçerken üç güçlü yardımcıya dikkat edebilirsin: C vitamini (aydınlık görünüm), hyaluronik asit (nem tutma) ve retinol (hücre yenilenme desteği). Hepsini aynı anda başlatmak yerine tek tek eklemek, cildin tepkisini anlamanı kolaylaştırır.

Unutma, iyi cilt sadece ürünlerle oluşmuyor. Düzenli uyku, yeterli su, dengeli beslenme ve stres yönetimi cildin görünümünü doğrudan etkiler. Kısacası rutin basit olabilir; önemli olan tutarlılık ve cildini dinlemek.`,
      categories: ["Cilt Bakımı", "Yaşam"],
      tags: ["cilt bakımı", "spf", "nemlendirme", "retinol"],
      featured: true,
    },
    {
      title: "Bozdağ'ın Doğal Güzelliği: Ruhu Tazeleyen Bir Kaçış",
      excerpt: "Bozdağ’da doğa yürüyüşü, temiz hava ve kısa bir hafta sonu molası için pratik öneriler.",
      content: `Şehir temposundan uzaklaşmak için bazen tek ihtiyacımız temiz hava ve iyi bir rota. Bozdağ, hem manzarası hem de farklı seviyelere uygun parkurlarıyla bu ihtiyacı karşılayan özel yerlerden biri.

Bölgenin en güzel tarafı, deneyim seviyesine göre seçenek sunması. Hafif tempolu yürüyüş yapanlar için daha kolay parkurlar var; biraz daha macera isteyenler ise zirveye çıkan rotalarda nefes kesen manzaralarla ödüllendiriliyor.

Ziyaret için en keyifli dönemler genelde ilkbahar ve sonbahar. Kışın ise bölge kayak ve kar aktiviteleriyle öne çıkıyor. Yanına rahat ayakkabı, katmanlı kıyafet, su ve küçük bir atıştırmalık alman günü çok daha konforlu hale getirir.

Doğaya çıkarken küçük ama etkili bir kural seti de akılda olmalı: çöp bırakmamak, patika dışına taşmamak, ateş konusunda dikkatli olmak ve gürültüyü minimumda tutmak. Böylece hem kendin iyi hissedersin hem de rota sonraki ziyaretçiler için korunur.

Kısa bir hafta sonu planında bile Bozdağ zihni sıfırlayan bir etki yaratıyor. Telefonu biraz kenara koyup yürüyüş ritmine girince, doğanın sakinleştirici tarafı gerçekten hissediliyor.`,
      categories: ["Seyahat", "Doğa"],
      tags: ["bozdağ", "yürüyüş", "doğa kaçamağı", "izmir"],
      featured: true,
    },
    {
      title: "Sabah Rutinini Sadeleştir: Güne Daha Hafif Başla",
      excerpt: "Az adımlı bir sabah planı ile hem zihinsel yükü hem karar yorgunluğunu azalt.",
      content: `Sabahları en çok zorlayan şey çoğu zaman zaman değil, dağınık başlangıç hissi. Kısa bir rutinle bunu toparlamak mümkün.

İlk adım: telefon ekranına bakmadan 10 dakika. Bu süre içinde su içmek, perdeyi açmak ve kısa bir nefes egzersizi yapmak günün tonunu değiştiriyor.

İkinci adım: üç maddelik mini plan. O gün mutlaka bitecek bir iş, ilerleme sağlayacak bir iş ve keyif için bir iş yaz. Bu yaklaşım hem odak sağlıyor hem de gün sonunda tatmin hissini artırıyor.`,
      categories: ["Verimlilik", "Yaşam"],
      tags: ["sabah rutini", "odak", "planlama"],
      featured: false,
    },
    {
      title: "Evden Çalışırken Dikkati Korumanın 7 Yolu",
      excerpt: "Bildirim, dağınık masa ve belirsiz saatleri yönetmek için basit çalışma sistemi.",
      content: `Evden çalışmada üretkenliği düşüren ana konu çoğu zaman dikkat dağılması. Küçük kurallarla ciddi fark yaratılabiliyor.

Bildirimleri toplu kontrol etmek, çalışma bloğu sırasında tek göreve odaklanmak ve mola saatini önceden belirlemek zihni rahatlatıyor. Masa düzenini gün içinde bir kez sıfırlamak da yeni başlangıç etkisi yaratıyor.

En önemli nokta şu: mükemmel gün peşinde koşmak yerine ortalama iyi günü standartlaştır. Her gün aynı birkaç temel adımı tekrar etmek, uzun vadede çok daha güçlü sonuç veriyor.`,
      categories: ["Verimlilik"],
      tags: ["evden çalışma", "odak", "zaman yönetimi"],
      featured: false,
    },
    {
      title: "Haftalık Planlama: Pazar Akşamı 30 Dakika Kuralı",
      excerpt: "Haftaya dağınık değil net başlamak için kısa ve uygulanabilir planlama ritüeli.",
      content: `Hafta içinde sürekli yangın söndürme hissi yaşıyorsan sorun genelde plan yokluğu. Pazar akşamı 30 dakika ayırmak bütün haftanın kalitesini yükseltiyor.

Önce takvimde sabit randevuları yerleştir, sonra derin odak gerektiren işleri blokla. Son olarak beklenmeyen işler için boş alan bırak. Tam dolu takvim, ilk aksilikte dağılır.

Planı gerçekçi kurduğunda erteleme azalır, gün içinde karar yorgunluğu düşer ve iş-özel hayat dengesi daha doğal olur.`,
      categories: ["Verimlilik", "Kişisel Gelişim"],
      tags: ["haftalık plan", "takvim", "odak blokları"],
      featured: false,
    },
    {
      title: "Dijital Detoks İçin Gerçekçi Bir Başlangıç Planı",
      excerpt: "Tamamen çevrimdışı olmak yerine ekran süresini akıllıca azaltmanın yolları.",
      content: `Dijital detoks çoğu kişiye “ya hep ya hiç” gibi geliyor. Oysa sürdürülebilir olan, küçük ama düzenli azaltım adımları.

Önce en çok zaman alan iki uygulamayı tespit et ve günlük limit koy. Yatmadan 45 dakika önce ekranı kapatma kuralı ekle. Sabah kalkınca ilk 15 dakikayı telefonsuz geçirmek de zihinsel berraklığı artırıyor.

Amaç teknolojiden kaçmak değil, teknolojiyi amaçlı kullanmak. Bu çizgiyi netleştirdiğinde gün içinde enerji ve odak belirgin şekilde iyileşiyor.`,
      categories: ["Yaşam", "Kişisel Gelişim"],
      tags: ["dijital detoks", "ekran süresi", "alışkanlık"],
      featured: false,
    },
    {
      title: "Bütçe Takibini Basitleştiren 50/30/20 Yaklaşımı",
      excerpt: "Aylık gelirini karmaşık tablolar olmadan yönetmek için net bir çerçeve.",
      content: `Bütçe yönetimi zor olmak zorunda değil. 50/30/20 yaklaşımı, başlangıç için sade ve güçlü bir sistem sunuyor.

Gelirin yüzde 50’sini temel ihtiyaçlara, yüzde 30’unu kişisel harcamalara, yüzde 20’sini birikim ve borç azaltmaya ayırmak genel bir denge sağlar. İlk ay birebir tutmasa bile oranları referans almak davranışı iyileştirir.

Önemli olan kusursuz tablo değil, düzenli takip. Haftada bir 10 dakikalık kontrol, ay sonunda büyük sürprizleri azaltır.`,
      categories: ["Finans", "Yaşam"],
      tags: ["bütçe", "birikim", "finansal düzen"],
      featured: false,
    },
    {
      title: "Uyku Kalitesini Artırmak İçin Akşam Rutinleri",
      excerpt: "Derin uykuya geçişi kolaylaştıran çevre düzeni ve alışkanlık önerileri.",
      content: `İyi uyku, iyi günün temelidir. Ama çoğu zaman uyumaya sadece “saat” olarak bakıyoruz, hazırlık kısmını atlıyoruz.

Işığı kademeli azaltmak, odanın ısısını düşürmek ve yatmadan önce ağır içerik tüketmemek geçişi kolaylaştırıyor. Kafein saatini öğleden sonra kesmek de fark yaratıyor.

Her gün aynı saatte yatağa yaklaşmak, biyolojik ritmi güçlendiriyor. Uyumadan önce 5 dakikalık sakin bir nefes döngüsü de zihni gevşetiyor.`,
      categories: ["Sağlık", "Yaşam"],
      tags: ["uyku", "akşam rutini", "enerji"],
      featured: false,
    },
    {
      title: "Yürüyüşe Yeni Başlayanlar İçin Doğru Tempo Rehberi",
      excerpt: "Hem güvenli hem keyifli yürüyüş için süre, tempo ve ekipman önerileri.",
      content: `Yürüyüşe başlarken en sık yapılan hata tempoyu erken yükseltmek. Aslında sürdürülebilir olan, düzenli ve orta şiddette ilerlemek.

İlk haftalarda 30-40 dakika bandı yeterli. Ayakkabı konforu ve su tüketimi performansı doğrudan etkiliyor. Rotayı güneş ve zemin durumuna göre seçmek sakatlık riskini azaltıyor.

Yürüyüşü bir “hedef” değil “ritim” olarak görmek, alışkanlığı kalıcı hale getiriyor.`,
      categories: ["Sağlık", "Doğa"],
      tags: ["yürüyüş", "başlangıç", "aktif yaşam"],
      featured: false,
    },
    {
      title: "Not Alma Sistemini Geliştir: Dağınıklığı Bilgiye Çevir",
      excerpt: "Toplanan fikirleri geri bulunabilir ve uygulanabilir hale getiren basit model.",
      content: `Not almak kolay, notu işe dönüştürmek zor. Bunun için hafif bir sınıflandırma sistemi şart.

Tek bir “gelen kutusu” not alanı kullan, haftada bir kez temize çek. Notu proje, fikir ve referans olarak etiketle. Sonra her notu bir sonraki aksiyonla eşleştir.

Aradığını hızlı bulabildiğin bir sistem kurduğunda notlar yük olmaktan çıkar, üretimi besleyen bir arşive dönüşür.`,
      categories: ["Verimlilik", "Kişisel Gelişim"],
      tags: ["not alma", "bilgi yönetimi", "ikinci beyin"],
      featured: false,
    },
    {
      title: "Şehirde Mikro Kaçamak: 1 Günde Yenilenme Planı",
      excerpt: "Uzak tatile gerek kalmadan haftalık stresi azaltan mini rota planı.",
      content: `Bazen uzun tatil mümkün olmaz; ama iyi planlanmış bir günlük kaçış bile zihni yeniler.

Sabah erken saatlerde doğaya yakın bir rota seçmek, öğlene kadar ekranı tamamen kapatmak ve kısa bir yürüyüşle günü başlatmak etkili oluyor. Öğleden sonra sakin bir kahve molası ve kısa okuma seansı da ritmi dengeliyor.

Önemli olan mesafe değil, dikkatini gerçekten dinlendirecek bir akış kurmak.`,
      categories: ["Seyahat", "Yaşam"],
      tags: ["mikro kaçamak", "hafta sonu", "yenilenme"],
      featured: false,
    },
    {
      title: "Cilt Bariyerini Korumak İçin 5 Temel Kural",
      excerpt: "Hassasiyeti azaltmak ve cildi güçlü tutmak için bariyer odaklı bakım yaklaşımı.",
      content: `Cilt bariyeri zayıfladığında kızarıklık, kuruluk ve hassasiyet artar. Bu nedenle “daha çok ürün” yerine “daha doğru ürün” yaklaşımı önemli.

Sık peeling yapmak yerine nazik temizlik, düzenli nem ve güneş koruması üçlüsüne odaklan. Yeni aktif içerikleri yavaş eklemek de bariyer stresini azaltır.

Parfümlü veya alkol ağırlıklı ürünlerde hassasiyetin artıyorsa içerik listesine dönüp sadeleşmek genelde hızlı rahatlama sağlar.`,
      categories: ["Cilt Bakımı", "Sağlık"],
      tags: ["cilt bariyeri", "hassas cilt", "nazik bakım"],
      featured: false,
    },
    {
      title: "Retinol ve C Vitamini Aynı Rutinde Nasıl Kullanılır?",
      excerpt: "Tahrişi azaltıp verimi artırmak için aktif içeriklerde doğru zamanlama önerileri.",
      content: `Aktif içeriklerde sorun genelde ürün değil, zamanlama. C vitaminini sabah, retinolu akşam kullanmak çoğu ciltte daha dengeli bir başlangıç sağlar.

Retinole haftada 2 gece ile başlamak ve aralarda nem bariyerini desteklemek tahriş riskini düşürür. Gündüz SPF adımını atlamamak ise bu rutinin olmazsa olmazıdır.

Cildin tepkisini izleyerek kademeli ilerlemek, kısa vadede sabırsızlık yaratsa da uzun vadede daha güvenli ve sürdürülebilir sonuç verir.`,
      categories: ["Cilt Bakımı"],
      tags: ["retinol", "c vitamini", "aktif içerik"],
      featured: false,
    },
    {
      title: "Bozdağ’a Kış Dışında Gitmek: İlkbahar ve Sonbahar Rotaları",
      excerpt: "Kış sezonu dışında Bozdağ’ı keşfetmek isteyenler için rota ve hazırlık notları.",
      content: `Bozdağ denince çoğu kişinin aklına kış geliyor ama ilkbahar ve sonbahar da bölgeyi keşfetmek için çok uygun.

Bu dönemlerde hava daha yumuşak, yürüyüş rotaları daha uzun süre keyifli kalıyor. Orman içi parkurlar, fotoğraf molaları ve kısa zirve denemeleri için dengeli bir atmosfer oluşuyor.

Yanına su, katmanlı kıyafet ve hafif yağmurluk almak yeterli. Rota öncesi hava durumunu kontrol etmek ve gün batımından önce dönüş planlamak güvenliği artırır.`,
      categories: ["Seyahat", "Doğa"],
      tags: ["bozdağ", "trekking", "rota planı"],
      featured: false,
    },
    {
      title: "Doğada Sorumlu Gezi: İz Bırakmama Prensipleri",
      excerpt: "Doğa gezilerinde çevresel etkiyi azaltmak için uygulanabilir etik kurallar.",
      content: `Doğada geçirilen zamanın keyifli olması kadar geride minimum etki bırakmak da önemli. Basit etik prensipler bu konuda güçlü bir çerçeve sunuyor.

Rota planını önceden yapmak, mevcut patikadan çıkmamak, atıkları geri taşımak ve ateş kullanımını dikkatle yönetmek ilk adımlar. Yaban hayatını uzaktan gözlemlemek ve sessiz kalmak da ekosisteme saygının parçası.

Küçük görünen bu davranışlar kalabalık kullanımda büyük fark yaratıyor. Doğaya misafir gibi yaklaşmak en güvenli ve en sürdürülebilir yaklaşım.`,
      categories: ["Doğa", "Yaşam"],
      tags: ["sorumlu gezi", "iz bırakma", "outdoor etik"],
      featured: false,
    },
    {
      title: "Pomodoro’yu Kendine Uydur: 25/5 Şart Değil",
      excerpt: "Tek bir süreye bağlı kalmadan odak bloklarını kişisel enerji ritmine göre ayarla.",
      content: `Pomodoro denince akla 25/5 geliyor; ama herkese aynı süre uymuyor. Önemli olan odak ve dinlenme dengesini kişisel ritme göre kurmak.

Derin işlerde 45/10 veya 50/10 daha verimli olabilir. Daha hafif işlerde 25/5 yeterli kalabilir. Haftalık gözlemle hangi bloklarda daha iyi performans aldığını görmek en doğru yolu gösterir.

Tek bir doğru yok; senin sürdürebildiğin düzen doğru düzendir.`,
      categories: ["Verimlilik"],
      tags: ["pomodoro", "odak", "çalışma tekniği"],
      featured: false,
    },
    {
      title: "Evde Mini Esneme Rutini: Masa Başına Karşı Koruma",
      excerpt: "Uzun oturma saatlerinde boyun, sırt ve kalça bölgesini rahatlatan kısa hareket akışı.",
      content: `Masa başında uzun süre kalınca bedenin en çok boyun, sırt ve kalça bölgesi geriliyor. Kısa bir esneme akışı bunu ciddi ölçüde azaltabiliyor.

Her 60-90 dakikada bir 3-5 dakika ayırmak yeterli: omuz geriye açma, göğüs esnetme, kalça fleksörlerini rahatlatma ve kısa yürüyüş. Hareketin sürekliliği yoğunluktan daha önemli.

Gün sonunda ağrı birikimini azaltmak için akşam 10 dakikalık hafif mobilite rutini de iyi sonuç veriyor.`,
      categories: ["Sağlık"],
      tags: ["esneme", "masa başı", "mobilite"],
      featured: false,
    },
    {
      title: "Balkon Bahçeciliği: Küçük Alanda Büyük Keyif",
      excerpt: "Balkonda bitki yetiştirmeye başlayanlar için yerleşim, sulama ve bakım notları.",
      content: `Balkon bahçeciliği hem zihni dinlendiriyor hem de günlük hayata küçük bir üretim neşesi katıyor. Başlangıç için az tür, düzenli bakım yaklaşımı en iyisi.

Işık alanına göre bitki seçmek ilk kural. Sulamayı takvime değil toprağın nemine göre yapmak daha sağlıklı sonuç veriyor. Küçük saksılarda drenajı ihmal etmemek kök sağlığı için kritik.

Zamanla kendi mini düzenini kurduğunda balkon, gün içindeki en sakin köşene dönüşebiliyor.`,
      categories: ["Yaşam", "Doğa"],
      tags: ["balkon", "bitki bakımı", "ev yaşamı"],
      featured: false,
    },
    {
      title: "Kitap Okuma Alışkanlığını Yeniden Kurmak",
      excerpt: "Okuma ritmini geri kazanmak için düşük bariyerli ve sürdürülebilir yöntemler.",
      content: `Uzun bir aradan sonra okuma alışkanlığına dönmek zor gelebilir. Çözüm genelde daha az hedef, daha çok süreklilik.

Başlangıçta günlük 10-15 dakika ve kısa bölümlü kitaplar iyi çalışır. Okuma saatini sabit bir rutine bağlamak (örneğin sabah kahvesi sonrası) davranışı güçlendirir.

Bitirilen kitap sayısından çok, kurulan düzen önemlidir. Düzen oturduğunda sayfa sayısı zaten doğal olarak artar.`,
      categories: ["Kişisel Gelişim", "Yaşam"],
      tags: ["okuma", "alışkanlık", "kişisel gelişim"],
      featured: false,
    },
    {
      title: "Hafta İçi Beslenmeyi Kolaylaştıran Meal Prep Planı",
      excerpt: "Yoğun günlerde sağlıklı kalmayı kolaylaştıran ön hazırlık yaklaşımı.",
      content: `Yoğun tempoda en çok zorlanan alanlardan biri beslenme. Hafta başında yapılan kısa hazırlık, hafta içi karar yükünü ciddi şekilde azaltıyor.

Temel protein, sebze ve karbonhidrat tabanını önceden hazırlamak; öğünleri birleştirmeyi kolaylaştırıyor. Atıştırmalıkları da görünür ve erişilebilir bir yere koymak gereksiz kaçamakları azaltıyor.

Mükemmel plan değil, uygulanabilir plan işe yarar. Her hafta küçük iyileştirmelerle sistem hızla oturuyor.`,
      categories: ["Sağlık", "Yaşam"],
      tags: ["meal prep", "beslenme", "planlama"],
      featured: false,
    },
  ];

  const categoryCache = new Map();
  const tagCache = new Map();

  async function getOrCreateCategory(name) {
    if (categoryCache.has(name)) {
      return categoryCache.get(name);
    }
    const slug = slugify(name) || "kategori";
    const byName = await prisma.category.findFirst({ where: { name } });
    if (byName) {
      categoryCache.set(name, byName);
      return byName;
    }
    const bySlug = await prisma.category.findUnique({ where: { slug } });
    const category = bySlug
      ? bySlug
      : await prisma.category.create({
        data: { name, slug },
      });
    categoryCache.set(name, category);
    return category;
  }

  async function getOrCreateTag(name) {
    if (tagCache.has(name)) {
      return tagCache.get(name);
    }
    const normalizedName = name.trim();
    const slug = slugify(normalizedName) || "etiket";
    const byName = await prisma.tag.findFirst({ where: { name: normalizedName } });
    if (byName) {
      tagCache.set(name, byName);
      return byName;
    }
    const bySlug = await prisma.tag.findUnique({ where: { slug } });
    const tag = bySlug
      ? bySlug
      : await prisma.tag.create({
        data: { name: normalizedName, slug },
      });
    tagCache.set(name, tag);
    return tag;
  }

  for (let index = 0; index < seedPosts.length; index += 1) {
    const post = seedPosts[index];
    const slug = slugify(post.title);
    const publishedAt = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    const readingTime = computeReadingTime(post.content);

    const upsertedPost = await prisma.post.upsert({
      where: { slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        status: "PUBLISHED",
        publishedAt,
        featured: post.featured ?? false,
        readingTime,
        authorId: admin.id,
      },
      create: {
        title: post.title,
        slug,
        excerpt: post.excerpt,
        content: post.content,
        status: "PUBLISHED",
        publishedAt,
        featured: post.featured ?? false,
        readingTime,
        authorId: admin.id,
      },
      select: { id: true, title: true, slug: true },
    });

    const categories = await Promise.all(post.categories.map((name) => getOrCreateCategory(name)));
    const tags = await Promise.all(post.tags.map((name) => getOrCreateTag(name)));

    await prisma.postCategory.deleteMany({ where: { postId: upsertedPost.id } });
    if (categories.length > 0) {
      await prisma.postCategory.createMany({
        data: categories.map((category) => ({
          postId: upsertedPost.id,
          categoryId: category.id,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.postTag.deleteMany({ where: { postId: upsertedPost.id } });
    if (tags.length > 0) {
      await prisma.postTag.createMany({
        data: tags.map((tag) => ({
          postId: upsertedPost.id,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  console.log(`Seed tamamlandi: ${seedPosts.length} yayinlanmis yazi hazir.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
