import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPage = () => (
  <div className="min-h-screen bg-[#0f0f10] text-gray-100 pt-24 pb-20 px-4">
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={16} /> Ana Sayfaya Dön
      </Link>

      <h1 className="text-2xl font-black text-white mb-2">Gizlilik Politikası</h1>
      <p className="text-xs text-gray-500 mb-10">Son güncelleme: {new Date().getFullYear()}</p>

      <div className="space-y-8 text-sm text-gray-300 leading-relaxed">

        <section>
          <p>
            Bu site ve uygulama (<span className="text-amber-500 font-bold">"Anipal"</span>), kullanıcılarına çevrimiçi anime içeriklerine erişim
            sağlamak amacıyla geliştirilmiştir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">Toplanan Bilgiler</h2>
          <p>
            Uygulama, doğrudan kullanıcıdan kişisel veri toplamaz. Ancak uygulama içerisinde kullanılan web sayfaları ve
            üçüncü taraf hizmetler (örneğin video oynatıcılar) bazı teknik verileri toplayabilir. Bu veriler IP adresi,
            tarayıcı bilgileri ve çerezleri içerebilir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">Üçüncü Taraf Hizmetler</h2>
          <p>
            Uygulama, içerikleri görüntülemek için üçüncü taraf web sitelerini ve video servislerini kullanabilir.
            Bu servislerin kendi gizlilik politikaları geçerlidir ve bu uygulama söz konusu hizmetlerin veri toplama
            süreçlerinden sorumlu değildir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">Çerezler (Cookies)</h2>
          <p>
            Uygulama içinde açılan web sayfaları çerez kullanabilir. Bu çerezler kullanıcı deneyimini geliştirmek
            amacıyla kullanılmaktadır.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">Veri Güvenliği</h2>
          <p>
            Uygulama, kullanıcı verilerini doğrudan saklamaz. Ancak üçüncü taraf servislerin veri güvenliği
            politikaları geçerli olabilir.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">Çocukların Gizliliği</h2>
          <p>
            Uygulama 13 yaş altındaki çocuklara yönelik değildir ve bilerek bu yaş grubundan veri toplamaz.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">Değişiklikler</h2>
          <p>
            Bu gizlilik politikası zaman zaman güncellenebilir. Güncellemeler bu sayfa üzerinden yayınlanacaktır.
          </p>
        </section>

        <section className="border-t border-gray-800 pt-8">
          <h2 className="text-base font-bold text-white mb-2">İletişim</h2>
          <p>
            Herhangi bir sorunuz varsa bizimle iletişime geçebilirsiniz:{' '}
            <a href="mailto:anipalbusiness@gmail.com" className="text-amber-500 hover:text-amber-400 transition-colors">
              anipalbusiness@gmail.com
            </a>
          </p>
        </section>

      </div>
    </div>
  </div>
);

export default PrivacyPage;
