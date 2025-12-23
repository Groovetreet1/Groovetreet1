import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function DocumentationPage() {
  const { language } = useLanguage();

  const texts = {
    fr: {
      title: "Documentation Windelevery",
      subtitle: "Tout comprendre sur le fonctionnement, les gains et les retraits.",
      backHome: "Retour accueil",
      sections: {
        overview: {
          title: "1. Presentation generale",
          body:
            "Windelevery est une plateforme qui permet de gagner de l'argent en realisant des missions simples. L'utilisateur regarde des videos ou valide des taches, puis recoit un gain credite sur son solde.",
        },
        howItWorks: {
          title: "2. Comment ca marche",
          items: [
            "Inscription et connexion a votre compte.",
            "Acces au tableau de bord pour voir les taches disponibles.",
            "Execution de la mission (video ou action demandee).",
            "Validation de la mission et credit du gain sur votre solde.",
          ],
        },
        tasks: {
          title: "3. Types de taches",
          items: [
            "Videos YouTube a regarder pendant un temps minimum.",
            "Missions rapides de validation selon les instructions affichees.",
            "Certaines taches peuvent demander un like ou une interaction.",
          ],
        },
        earnings: {
          title: "4. Gains et recompenses",
          body:
            "Chaque mission validee ajoute un montant au solde. Les gains varient selon le type de tache et le niveau de l'utilisateur. Les utilisateurs VIP peuvent obtenir des gains journaliers plus eleves.",
        },
        withdrawals: {
          title: "5. Retraits",
          items: [
            "Les retraits se font vers un compte bancaire renseigne dans le profil.",
            "Les montants de retrait sont fixes selon les options disponibles.",
            "Chaque demande est verifiee par l'administration avant validation.",
          ],
        },
        deposits: {
          title: "6. Depots",
          body:
            "Le depot permet d'activer certaines options et d'acceder aux plans VIP. Apres depot, l'administration confirme la transaction et met a jour votre compte.",
        },
        vip: {
          title: "7. Plans VIP",
          body:
            "Les plans VIP offrent un meilleur rendement quotidien, plus de taches et des avantages supplementaires. Le plan active se voit dans votre profil.",
        },
        security: {
          title: "8. Securite et compte",
          body:
            "Gardez vos informations a jour (email, mot de passe, compte bancaire). Votre session peut expirer, il suffit de vous reconnecter.",
        },
        support: {
          title: "9. Support",
          body:
            "En cas de probleme, contactez le support via les canaux disponibles dans l'application.",
        },
      },
    },
    ar: {
      title: "وثائق Windelevery",
      subtitle: "شرح كامل لكيفاش خدام الموقع، الربح والسحب.",
      backHome: "رجوع للصفحة الرئيسية",
      sections: {
        overview: {
          title: "1. تقديم عام",
          body:
            "Windelevery منصة كتخليك تربح من مهام بسيطة. المستخدم كيشوف فيديوهات ولا كيدير مهام، ومن بعد كيزيد الرصيد فالحساب.",
        },
        howItWorks: {
          title: "2. كيفاش خدام",
          items: [
            "تسجل وكتدخل للحساب.",
            "كتدخل للداشبورد وتشوف المهام المتاحة.",
            "كتكمل المهمة (فيديو ولا عمل مطلوب).",
            "كتأكد المهمة وكيتزاد الربح فالميزان.",
          ],
        },
        tasks: {
          title: "3. انواع المهام",
          items: [
            "فيديوهات يوتوب خاص تشوفهم لوقت معين.",
            "مهام سريعة حسب التعليمات.",
            "بعض المهام كيتطلبو لايك ولا تفاعل.",
          ],
        },
        earnings: {
          title: "4. الربح والمكافات",
          body:
            "كل مهمة كيتصادقات كيزيد مبلغ فالميزان. الربح كيختلف حسب نوع المهمة والمستوى. مستخدمين VIP عندهم ربح يومي اكبر.",
        },
        withdrawals: {
          title: "5. السحب",
          items: [
            "السحب كيتدار للحساب البنكي لي ضفت فالبروفايل.",
            "كاينين مبالغ سحب محددين حسب الاختيارات.",
            "كل طلب سحب كيدوز عند الادارة للتأكيد.",
          ],
        },
        deposits: {
          title: "6. الشحن",
          body:
            "الشحن كيعاونك تفعل بعض المزايا وتدخل لخطط VIP. من بعد الشحن، الادارة كتأكد وكتحدث الحساب.",
        },
        vip: {
          title: "7. خطط VIP",
          body:
            "خطط VIP كتقدم ربح يومي اكبر ومهام اكثر وامتيازات اضافية. الخطة المفعلة كتبان فالبروفايل.",
        },
        security: {
          title: "8. الامان والحساب",
          body:
            "خلي معلوماتك محدثة (ايميل، كلمة السر، حساب بنكي). الجلسة ممكن تسالي، غير عاود دخل.",
        },
        support: {
          title: "9. الدعم",
          body:
            "اذا كان شي مشكل، تواصل مع الدعم من داخل التطبيق.",
        },
      },
    },
  };

  const t = texts[language] || texts.fr;

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <header className="w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/app-icon.png"
              alt="Windelevery"
              className="h-8 w-8 rounded-2xl object-cover"
            />
            <div className="text-sm font-semibold">{t.title}</div>
          </div>
          <Link
            to="/"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            {t.backHome}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">{t.title}</h1>
          <p className="text-sm text-slate-300 mt-2">{t.subtitle}</p>
        </div>

        <section className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.overview.title}</h2>
            <p className="text-sm text-slate-300">{t.sections.overview.body}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.howItWorks.title}</h2>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              {t.sections.howItWorks.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.tasks.title}</h2>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              {t.sections.tasks.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.earnings.title}</h2>
            <p className="text-sm text-slate-300">{t.sections.earnings.body}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.withdrawals.title}</h2>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              {t.sections.withdrawals.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.deposits.title}</h2>
            <p className="text-sm text-slate-300">{t.sections.deposits.body}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.vip.title}</h2>
            <p className="text-sm text-slate-300">{t.sections.vip.body}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.security.title}</h2>
            <p className="text-sm text-slate-300">{t.sections.security.body}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-2">{t.sections.support.title}</h2>
            <p className="text-sm text-slate-300">{t.sections.support.body}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
