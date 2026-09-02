/**
 * Faz 2 — legal / support UI body copy (non-billing).
 * Billing store-specific paragraphs stay in billing.* via billingCopy.{ios,android,ts}.
 * Do NOT claim audio never leaves the device — recordings are uploaded for analysis.
 */

export const phase2LegalEn = {
  privacy: {
    introBody:
      'Voira provides English speaking, shadowing, pronunciation practice, a vocabulary notebook, progress tracking, and SpeakPlus premium access. This summary explains how data is handled in the app. The full policy is on the web page.',
    audioBody:
      'Microphone permission is requested only when you want to record. Your recording is sent to the Voira server for analysis. Microsoft Azure Speech may be used for pronunciation assessment. When the backend is enabled, OpenAI may process your recorded audio for speech-to-text/transcription and AI coach feedback. We do not use recordings to build a public profile or sell voice data.',
    sharingBody:
      'We do not sell personal data. We share or process data with service providers only as needed to operate the app. Disclosure may occur when required by law or for security.',
    childrenBody:
      'Voira is not directed to children under 13. We do not knowingly collect personal information from children under 13. If a parent or guardian believes a child provided data, they can contact us.',
    contactBody: 'Privacy requests: {{email}}',
  },
  terms: {
    acceptBody:
      'Voira is developed by StudioWebia. By downloading or using Voira, you accept these Terms of Use. If you do not accept them, do not use the app.',
    useBody:
      'Voira offers English speaking / shadowing practice, pronunciation feedback, vocabulary tools, and progress tracking. You agree to use the app only for lawful personal learning purposes.',
    accountBody:
      'If you create an account, you are responsible for keeping your credentials private and for activity on your account. Guest use may offer limited persistence; an account helps protect progress and SpeakPlus access.',
    scoresBody:
      'Voira provides practice and feedback; it does not guarantee a language certificate, medical advice, or official accreditation. Scores are estimates and may vary with microphone quality, accent, background noise, connectivity, and speech clarity.',
    acceptableBody:
      'Do not abuse the app, reverse engineer it beyond legal limits, overload the backend with automated requests, bypass limits/paywalls, or submit illegal or harassing content.',
    ipBody:
      'App content, design, lessons, and branding belong to Voira and StudioWebia (except third-party marks). You are responsible for content you record; you grant a limited permission to process audio and text solely to provide app features.',
    disclaimerBody:
      'Voira is provided “as is.” To the extent allowed by law, liability for indirect damages and learning outcomes is disclaimed. Disputes are governed by the laws of the Republic of Türkiye (mandatory consumer protections reserved).',
    contactBody: 'StudioWebia\nQuestions: {{email}}',
  },
  dataDeletion: {
    guestBody:
      'In guest mode, practice history, scores, and session records are kept on this device. Without creating an account, cloud account data may not be created.',
    localResetIntro:
      'The button below only resets local practice data on this device. It is not account deletion and does not cancel a store subscription.',
    requestBody:
      'For an account and data deletion request, email Voira Support ({{email}}). Include the email you use in the app. Subject: Voira Data Deletion Request. This is not one-tap automatic deletion; your request is verified and then processed.',
    afterVerifyBody:
      'After a verified deletion request, data linked to your account is deleted or de-identified, subject to legal / security / fraud-prevention / transaction-record obligations. This may include account data and, if stored, progress, vocabulary notebook, and analysis history.',
    inAppDeleteBody:
      'To delete a signed-in account, use Profile → Delete account. After you confirm, account deletion completes in the app.',
  },
  about: {
    whatBody:
      'Voira is an AI speaking coach that analyzes your English, measures pronunciation, and helps you improve weak words with clear explanations.',
    versionBody:
      'Speech analysis is based on word matching, Azure pronunciation assessment, and fluency measures. Scores are guidance only and are not an official language certificate.',
    contactLegalBody:
      'StudioWebia\nVoira Support: {{email}}\nPrivacy Policy and Terms of Use are available on the web pages.',
    versionLabel: 'Voira v{{version}}',
  },
  support: {
    emailBody:
      '{{email}}\n\nBriefly describe the issue; including your device model and app version helps.',
    topicsBody:
      '• Microphone permission denied or recording will not start\n• Analysis fails or shows an analysis error\n• Lesson audio will not play or the audio file is missing\n• SpeakPlus / purchase or restore subscription\n• Data deletion and privacy',
    emailSubject: 'Voira Support',
  },
} as const;

export const phase2LegalTr = {
  privacy: {
    introBody:
      'Voira; İngilizce konuşma, shadowing, telaffuz, kelime defteri, ilerleme takibi ve SpeakPlus premium erişimi sunar. Bu özet, uygulamadaki veri uygulamalarını açıklar. Tam metin web sayfasındadır.',
    audioBody:
      'Mikrofon izni yalnızca kayıt yapmak istediğinde istenir. Kayıt, analiz için Voira sunucusuna gönderilir. Telaffuz değerlendirmesi için Microsoft Azure Speech kullanılabilir. Backend etkinse OpenAI, kayıtlı sesini speech-to-text/transcription için işleyebilir ve AI koç geri bildirimi üretebilir. Ses kayıtlarını herkese açık profil oluşturmak veya ses verisi satmak için kullanmayız.',
    sharingBody:
      'Kişisel verileri satmayız. Verileri yalnızca uygulamayı işletmek için hizmet sağlayıcılarla paylaşır/işleriz. Yasalar gerektirirse veya güvenlik için açıklama yapılabilir.',
    childrenBody:
      'Voira 13 yaş altı çocuklara yönelik değildir. 13 yaş altından bilerek kişisel bilgi toplamayız. Bir ebeveyn/vasi çocuğunun veri verdiğini düşünüyorsa bizimle iletişime geçebilir.',
    contactBody: 'Gizlilik talepleri: {{email}}',
  },
  terms: {
    acceptBody:
      'Voira, StudioWebia tarafından geliştirilmiştir. Voira’yı indirerek veya kullanarak bu Kullanım Şartlarını kabul etmiş olursun. Kabul etmiyorsan uygulamayı kullanma.',
    useBody:
      'Voira; İngilizce konuşma / shadowing pratiği, telaffuz geri bildirimi, kelime araçları ve ilerleme takibi sunar. Uygulamayı yalnızca yasal ve kişisel öğrenme amaçlı kullanmayı kabul edersin.',
    accountBody:
      'Hesap oluşturursan giriş bilgilerinin gizliliğinden ve hesabındaki etkinliklerden sen sorumlusun. Misafir kullanım sınırlı kalıcılık sunabilir; hesap, ilerleme ve SpeakPlus erişimini korumaya yardımcı olur.',
    scoresBody:
      'Voira pratik ve geri bildirim sağlar; dil sertifikası, tıbbi tavsiye veya resmi akreditasyon garantisi vermez. Skorlar tahmindir; mikrofon kalitesi, aksan, arka plan gürültüsü, internet ve konuşma netliğine göre değişebilir.',
    acceptableBody:
      'Uygulamayı kötüye kullanma, tersine mühendislik (yasal sınırlar dışında), backend’i otomatik isteklerle zorlama, limit/paywall aşma, yasa dışı veya taciz içerik gönderme yasaktır.',
    ipBody:
      'Uygulama içeriği, tasarım, dersler ve marka Voira ve StudioWebia’ya aittir (üçüncü taraf markalar hariç). Kaydettiğin içerikten sen sorumlusun; analiz özellikleri için ses ve metnin yalnızca uygulama özelliklerini sunmak üzere işlenmesine sınırlı izin verirsin.',
    disclaimerBody:
      'Voira “olduğu gibi” sunulur. Yasaların izin verdiği ölçüde dolaylı zararlar ve öğrenme sonuçları için sorumluluk kabul edilmez. Uyuşmazlıklarda Türkiye Cumhuriyeti hukukuna başvurulur (zorunlu tüketici koruma kuralları saklıdır).',
    contactBody: 'StudioWebia\nSorular için: {{email}}',
  },
  dataDeletion: {
    guestBody:
      'Misafir modunda pratik geçmişi, skorlar ve oturum kayıtları bu cihazda tutulur. Hesap oluşturmadan bulut hesabı verisi oluşmayabilir.',
    localResetIntro:
      'Aşağıdaki düğme yalnızca bu cihazdaki yerel pratik verilerini sıfırlar. Hesap silme değildir ve mağaza aboneliğini iptal etmez.',
    requestBody:
      'Hesap ve veri silme talebi için Voira Destek’e ({{email}}) yazabilirsin. Uygulamada kullandığın e-posta adresini ekle. Konu: Voira Data Deletion Request. Bu otomatik tek dokunuşla silme değildir; talebin doğrulanarak işlenir.',
    afterVerifyBody:
      'Doğrulanmış bir silme talebinden sonra, yasal / güvenlik / dolandırıcılık önleme / işlem kaydı zorunlulukları saklı kalmak üzere hesabınla ilişkili veriler silinir veya kimlikten arındırılır. Buna hesap verileri; saklanıyorsa ilerleme, kelime defteri ve analiz geçmişi dahil olabilir.',
    inAppDeleteBody:
      'Kayıtlı hesabını silmek için Profil → Hesabı Sil yolunu kullan. Onayladıktan sonra hesap silme işlemi uygulama içinde tamamlanır.',
  },
  about: {
    whatBody:
      'Voira, İngilizce konuşmanı analiz eden, telaffuzunu ölçen ve zayıf kelimelerini net açıklamalarla geliştirmene yardımcı olan AI konuşma koçudur.',
    versionBody:
      'Konuşma analizi kelime eşleşmesi, Azure telaffuz değerlendirmesi ve akıcılık ölçümlerine dayanır. Skorlar rehber niteliğindedir; resmi dil sertifikası yerine geçmez.',
    contactLegalBody:
      'StudioWebia\nVoira Destek: {{email}}\nGizlilik Politikası ve Kullanım Şartları web sayfalarından okunabilir.',
    versionLabel: 'Voira v{{version}}',
  },
  support: {
    emailBody:
      '{{email}}\n\nSorununu kısaca anlat; cihaz modeli ve uygulama sürümünü eklemen yardımcı olur.',
    topicsBody:
      '• Mikrofon izni verilmiyor veya kayıt başlamıyor\n• Analiz çalışmıyor veya analiz hatası görünüyor\n• Ders sesi çalmıyor veya ses dosyası eksik\n• SpeakPlus / satın alma veya abonelik geri yükleme\n• Veri silme ve gizlilik',
    emailSubject: 'Voira Destek',
  },
} as const;

/** Compact overlays for es/pt/id/ar — English fills any missing keys via deepMerge. */
export const phase2LegalEs = {
  privacy: {
    introBody:
      'Voira ofrece práctica de inglés hablado, shadowing, pronunciación, cuaderno de vocabulario, seguimiento del progreso y acceso premium SpeakPlus. Este resumen explica el manejo de datos en la app. El texto completo está en la web.',
    audioBody:
      'El permiso de micrófono se pide solo cuando quieres grabar. La grabación se envía al servidor de Voira para el análisis. Puede usarse Microsoft Azure Speech para evaluar pronunciación. Si el backend está activo, OpenAI puede procesar el audio para transcripción y feedback del coach de IA. No usamos las grabaciones para perfiles públicos ni vendemos datos de voz.',
    sharingBody:
      'No vendemos datos personales. Compartimos o procesamos datos con proveedores solo para operar la app. Puede haber divulgación si la ley lo exige o por seguridad.',
    childrenBody:
      'Voira no está dirigido a menores de 13 años. No recopilamos a sabiendas datos de menores de 13. Un padre o tutor puede contactarnos si cree que un menor aportó datos.',
    contactBody: 'Solicitudes de privacidad: {{email}}',
  },
  terms: {
    acceptBody:
      'Voira es desarrollado por StudioWebia. Al descargar o usar Voira, aceptas estos Términos de uso. Si no los aceptas, no uses la app.',
    useBody:
      'Voira ofrece práctica de inglés / shadowing, feedback de pronunciación, herramientas de vocabulario y seguimiento del progreso. Aceptas usarla solo con fines legales de aprendizaje personal.',
    accountBody:
      'Si creas una cuenta, eres responsable de la privacidad de tus credenciales y de la actividad en tu cuenta. El modo invitado puede tener persistencia limitada; una cuenta ayuda a proteger el progreso y SpeakPlus.',
    scoresBody:
      'Voira ofrece práctica y feedback; no garantiza certificados de idioma, consejo médico ni acreditación oficial. Las puntuaciones son estimaciones y pueden variar.',
    acceptableBody:
      'No abuses de la app, no hagas ingeniería inversa fuera de los límites legales, no satures el backend, no evadas límites/paywalls ni envíes contenido ilegal o de acoso.',
    ipBody:
      'El contenido, diseño, lecciones y marca pertenecen a Voira y StudioWebia (salvo marcas de terceros). Eres responsable de lo que grabas; otorgas permiso limitado para procesar audio y texto solo para ofrecer funciones de la app.',
    disclaimerBody:
      'Voira se ofrece “tal cual”. En la medida permitida por la ley, se excluye responsabilidad por daños indirectos y resultados de aprendizaje. Los conflictos se rigen por las leyes de la República de Türkiye.',
    contactBody: 'StudioWebia\nConsultas: {{email}}',
  },
  dataDeletion: {
    guestBody:
      'En modo invitado, el historial, puntuaciones y sesiones se guardan en este dispositivo. Sin cuenta, puede no crearse datos de cuenta en la nube.',
    localResetIntro:
      'El botón de abajo solo restablece datos locales de práctica. No es eliminación de cuenta y no cancela una suscripción de la tienda.',
    requestBody:
      'Para solicitar eliminación de cuenta y datos, escribe a Soporte Voira ({{email}}). Incluye el correo que usas en la app. Asunto: Voira Data Deletion Request. No es borrado automático de un toque; la solicitud se verifica y procesa.',
    afterVerifyBody:
      'Tras una solicitud verificada, los datos vinculados a tu cuenta se eliminan o desidentifican, salvo obligaciones legales / de seguridad / antifraude / de registro. Puede incluir datos de cuenta y, si se guardan, progreso, vocabulario e historial de análisis.',
    inAppDeleteBody:
      'Para eliminar una cuenta iniciada, usa Perfil → Eliminar cuenta. Tras confirmar, la eliminación se completa en la app.',
  },
  about: {
    whatBody:
      'Voira es un coach de conversación con IA que analiza tu inglés, mide la pronunciación y te ayuda a mejorar palabras débiles con explicaciones claras.',
    versionBody:
      'El análisis se basa en coincidencia de palabras, evaluación de pronunciación de Azure y medidas de fluidez. Las puntuaciones son orientativas, no un certificado oficial.',
    contactLegalBody:
      'StudioWebia\nSoporte Voira: {{email}}\nLa Política de privacidad y los Términos de uso están en las páginas web.',
    versionLabel: 'Voira v{{version}}',
  },
  support: {
    emailBody:
      '{{email}}\n\nDescribe el problema brevemente; incluir modelo del dispositivo y versión de la app ayuda.',
    topicsBody:
      '• Permiso de micrófono denegado o la grabación no inicia\n• El análisis falla o muestra un error\n• El audio de la lección no se reproduce o falta el archivo\n• SpeakPlus / compra o restauración de suscripción\n• Eliminación de datos y privacidad',
    emailSubject: 'Soporte Voira',
  },
} as const;

export const phase2LegalPt = {
  privacy: {
    introBody:
      'O Voira oferece prática de inglês falado, shadowing, pronúncia, caderno de vocabulário, progresso e acesso SpeakPlus. Este resumo explica o tratamento de dados no app. O texto completo está na web.',
    audioBody:
      'A permissão do microfone é pedida só quando você quer gravar. A gravação é enviada ao servidor do Voira para análise. O Microsoft Azure Speech pode ser usado na avaliação de pronúncia. Com o backend ativo, a OpenAI pode processar o áudio para transcrição e feedback do coach de IA. Não usamos gravações para perfis públicos nem vendemos dados de voz.',
    sharingBody:
      'Não vendemos dados pessoais. Compartilhamos ou processamos dados com provedores só para operar o app. Pode haver divulgação quando a lei exigir ou por segurança.',
    childrenBody:
      'O Voira não é direcionado a menores de 13 anos. Não coletamos de propósito dados de menores de 13. Pais/responsáveis podem falar conosco se acreditarem que um menor enviou dados.',
    contactBody: 'Pedidos de privacidade: {{email}}',
  },
  terms: {
    acceptBody:
      'O Voira é desenvolvido pela StudioWebia. Ao baixar ou usar o Voira, você aceita estes Termos de Uso. Se não aceitar, não use o app.',
    useBody:
      'O Voira oferece prática de inglês / shadowing, feedback de pronúncia, ferramentas de vocabulário e progresso. Você concorda em usar o app apenas para aprendizado pessoal e legal.',
    accountBody:
      'Se criar uma conta, você é responsável pelas credenciais e pela atividade na conta. O modo convidado pode ter persistência limitada; uma conta ajuda a proteger progresso e SpeakPlus.',
    scoresBody:
      'O Voira oferece prática e feedback; não garante certificado de idioma, conselho médico ou acreditação oficial. As pontuações são estimativas e podem variar.',
    acceptableBody:
      'Não abuse do app, não faça engenharia reversa além dos limites legais, não sobrecarregue o backend, não contorne limites/paywalls nem envie conteúdo ilegal ou de assédio.',
    ipBody:
      'Conteúdo, design, lições e marca pertencem ao Voira e à StudioWebia (exceto marcas de terceiros). Você é responsável pelo que grava e concede permissão limitada para processar áudio e texto só para recursos do app.',
    disclaimerBody:
      'O Voira é oferecido “como está”. Na medida permitida pela lei, não há responsabilidade por danos indiretos e resultados de aprendizado. Controvérsias seguem as leis da República da Türkiye.',
    contactBody: 'StudioWebia\nDúvidas: {{email}}',
  },
  dataDeletion: {
    guestBody:
      'No modo convidado, histórico, pontuações e sessões ficam neste dispositivo. Sem conta, dados de conta na nuvem podem não ser criados.',
    localResetIntro:
      'O botão abaixo só redefine dados locais de prática. Não é exclusão de conta e não cancela assinatura da loja.',
    requestBody:
      'Para pedir exclusão de conta e dados, escreva para o Suporte Voira ({{email}}). Inclua o e-mail usado no app. Assunto: Voira Data Deletion Request. Não é exclusão automática com um toque; o pedido é verificado e processado.',
    afterVerifyBody:
      'Após um pedido verificado, dados ligados à sua conta são excluídos ou desidentificados, ressalvadas obrigações legais / de segurança / antifraude / de registro. Pode incluir dados da conta e, se armazenados, progresso, vocabulário e histórico de análise.',
    inAppDeleteBody:
      'Para excluir uma conta logada, use Perfil → Excluir conta. Depois de confirmar, a exclusão é concluída no app.',
  },
  about: {
    whatBody:
      'O Voira é um coach de conversação com IA que analisa seu inglês, mede a pronúncia e ajuda a melhorar palavras fracas com explicações claras.',
    versionBody:
      'A análise se baseia em correspondência de palavras, avaliação de pronúncia da Azure e medidas de fluência. As pontuações são orientativas, não um certificado oficial.',
    contactLegalBody:
      'StudioWebia\nSuporte Voira: {{email}}\nPolítica de Privacidade e Termos de Uso estão nas páginas web.',
    versionLabel: 'Voira v{{version}}',
  },
  support: {
    emailBody:
      '{{email}}\n\nDescreva o problema de forma breve; incluir modelo do dispositivo e versão do app ajuda.',
    topicsBody:
      '• Permissão do microfone negada ou a gravação não inicia\n• A análise falha ou mostra erro\n• O áudio da lição não toca ou o arquivo está ausente\n• SpeakPlus / compra ou restauração de assinatura\n• Exclusão de dados e privacidade',
    emailSubject: 'Suporte Voira',
  },
} as const;

export const phase2LegalId = {
  privacy: {
    introBody:
      'Voira menyediakan latihan berbicara bahasa Inggris, shadowing, pengucapan, buku kosakata, progres, dan akses SpeakPlus. Ringkasan ini menjelaskan penanganan data di aplikasi. Teks lengkap ada di halaman web.',
    audioBody:
      'Izin mikrofon diminta hanya saat Anda ingin merekam. Rekaman dikirim ke server Voira untuk analisis. Microsoft Azure Speech dapat digunakan untuk penilaian pengucapan. Jika backend aktif, OpenAI dapat memproses audio untuk transkripsi dan umpan balik coach AI. Kami tidak memakai rekaman untuk profil publik atau menjual data suara.',
    sharingBody:
      'Kami tidak menjual data pribadi. Data dibagikan/diproses dengan penyedia hanya untuk menjalankan aplikasi. Pengungkapan dapat terjadi jika diwajibkan hukum atau demi keamanan.',
    childrenBody:
      'Voira tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak sengaja mengumpulkan data dari anak di bawah 13. Orang tua/wali dapat menghubungi kami jika anak memberikan data.',
    contactBody: 'Permintaan privasi: {{email}}',
  },
  terms: {
    acceptBody:
      'Voira dikembangkan oleh StudioWebia. Dengan mengunduh atau memakai Voira, Anda menerima Syarat Penggunaan ini. Jika tidak setuju, jangan gunakan aplikasi.',
    useBody:
      'Voira menawarkan latihan berbicara / shadowing, umpan balik pengucapan, alat kosakata, dan progres. Anda setuju memakai aplikasi hanya untuk pembelajaran pribadi yang sah.',
    accountBody:
      'Jika membuat akun, Anda bertanggung jawab atas kredensial dan aktivitas akun. Mode tamu mungkin terbatas; akun membantu melindungi progres dan SpeakPlus.',
    scoresBody:
      'Voira memberi latihan dan umpan balik; tidak menjamin sertifikat bahasa, saran medis, atau akreditasi resmi. Skor bersifat perkiraan dan dapat berbeda.',
    acceptableBody:
      'Jangan menyalahgunakan aplikasi, rekayasa balik di luar batas hukum, membebani backend, melewati limit/paywall, atau mengirim konten ilegal/pelecehan.',
    ipBody:
      'Konten, desain, pelajaran, dan merek milik Voira dan StudioWebia (kecuali merek pihak ketiga). Anda bertanggung jawab atas rekaman Anda dan memberi izin terbatas untuk memproses audio/teks demi fitur aplikasi.',
    disclaimerBody:
      'Voira disediakan “sebagaimana adanya”. Sejauh diizinkan hukum, tanggung jawab atas kerugian tidak langsung dan hasil belajar dikecualikan. Sengketa tunduk pada hukum Republik Türkiye.',
    contactBody: 'StudioWebia\nPertanyaan: {{email}}',
  },
  dataDeletion: {
    guestBody:
      'Di mode tamu, riwayat latihan, skor, dan sesi disimpan di perangkat ini. Tanpa akun, data akun cloud mungkin tidak dibuat.',
    localResetIntro:
      'Tombol di bawah hanya mereset data latihan lokal. Bukan penghapusan akun dan tidak membatalkan langganan toko.',
    requestBody:
      'Untuk permintaan hapus akun dan data, email Dukungan Voira ({{email}}). Sertakan email yang dipakai di aplikasi. Subjek: Voira Data Deletion Request. Ini bukan hapus otomatis satu ketukan; permintaan diverifikasi lalu diproses.',
    afterVerifyBody:
      'Setelah permintaan terverifikasi, data terkait akun dihapus atau dianonimkan, dengan pengecualian kewajiban hukum / keamanan / antifraud / catatan transaksi. Dapat mencakup data akun dan, jika disimpan, progres, kosakata, serta riwayat analisis.',
    inAppDeleteBody:
      'Untuk menghapus akun yang masuk, gunakan Profil → Hapus akun. Setelah konfirmasi, penghapusan selesai di aplikasi.',
  },
  about: {
    whatBody:
      'Voira adalah coach berbicara AI yang menganalisis bahasa Inggris Anda, mengukur pengucapan, dan membantu memperbaiki kata lemah dengan penjelasan jelas.',
    versionBody:
      'Analisis didasarkan pada pencocokan kata, penilaian pengucapan Azure, dan ukuran kefasihan. Skor bersifat panduan, bukan sertifikat resmi.',
    contactLegalBody:
      'StudioWebia\nDukungan Voira: {{email}}\nKebijakan Privasi dan Syarat Penggunaan tersedia di halaman web.',
    versionLabel: 'Voira v{{version}}',
  },
  support: {
    emailBody:
      '{{email}}\n\nJelaskan masalah secara singkat; menyertakan model perangkat dan versi aplikasi membantu.',
    topicsBody:
      '• Izin mikrofon ditolak atau rekaman tidak mulai\n• Analisis gagal atau menampilkan error\n• Audio pelajaran tidak diputar atau file hilang\n• SpeakPlus / pembelian atau pemulihan langganan\n• Penghapusan data dan privasi',
    emailSubject: 'Dukungan Voira',
  },
} as const;

export const phase2LegalAr = {
  privacy: {
    introBody:
      'توفر Voira ممارسة التحدث بالإنجليزية وshadowing والنطق ودفتر المفردات وتتبع التقدم وSpeakPlus. يلخّص هذا النص معالجة البيانات في التطبيق. النص الكامل على الويب.',
    audioBody:
      'يُطلب إذن الميكروفون فقط عند التسجيل. يُرسل التسجيل إلى خادم Voira للتحليل. قد يُستخدم Microsoft Azure Speech لتقييم النطق. عند تفعيل الواجهة الخلفية قد تعالج OpenAI الصوت للنسخ وملاحظات المدرب. لا نستخدم التسجيلات لملفات عامة ولا نبيع بيانات الصوت.',
    sharingBody:
      'لا نبيع البيانات الشخصية. نشاركها أو نعالجها مع مزودي الخدمات لتشغيل التطبيق فقط. قد يحدث إفصاح إذا اقتضى القانون أو للأمان.',
    childrenBody:
      'Voira غير موجّه لمن دون 13 عاماً. لا نجمع عن قصد بياناتهم. يمكن لولي الأمر التواصل معنا إن اعتقد أن طفلاً قدّم بيانات.',
    contactBody: 'طلبات الخصوصية: {{email}}',
  },
  terms: {
    acceptBody:
      'طُوّرت Voira بواسطة StudioWebia. بتنزيل Voira أو استخدامها تقبل شروط الاستخدام. إن لم تقبل فلا تستخدم التطبيق.',
    useBody:
      'توفر Voira ممارسة التحدث / shadowing وملاحظات النطق وأدوات المفردات وتتبع التقدم. توافق على الاستخدام لأغراض التعلم الشخصي القانونية فقط.',
    accountBody:
      'إن أنشأت حساباً فأنت مسؤول عن بيانات الدخول ونشاط الحساب. وضع الضيف قد يكون محدود الاستمرارية؛ الحساب يساعد على حماية التقدم وSpeakPlus.',
    scoresBody:
      'توفر Voira ممارسة وملاحظات؛ ولا تضمن شهادة لغة أو نصيحة طبية أو اعتماداً رسمياً. الدرجات تقديرية وقد تختلف.',
    acceptableBody:
      'لا تُسئ استخدام التطبيق أو تعكس هندسته خارج الحدود القانونية أو تُثقل الواجهة الخلفية أو تتجاوز الحدود/الدفع أو ترسل محتوى غير قانوني أو مسيئاً.',
    ipBody:
      'المحتوى والتصميم والدروس والعلامة ملك Voira وStudioWebia (باستثناء علامات الغير). أنت مسؤول عما تسجّله وتمنح إذناً محدوداً لمعالجة الصوت والنص لتقديم الميزات فقط.',
    disclaimerBody:
      'تُقدَّم Voira «كما هي». في حدود القانون لا تُقبل مسؤولية الأضرار غير المباشرة ونتائج التعلم. تخضع النزاعات لقوانين جمهورية تركيا.',
    contactBody: 'StudioWebia\nللاستفسار: {{email}}',
  },
  dataDeletion: {
    guestBody:
      'في وضع الضيف تُحفظ سجل الممارسة والدرجات والجلسات على هذا الجهاز. بدون حساب قد لا تُنشأ بيانات حساب سحابي.',
    localResetIntro:
      'الزر أدناه يعيد ضبط بيانات الممارسة المحلية فقط. ليس حذف حساب ولا يلغي اشتراك المتجر.',
    requestBody:
      'لطلب حذف الحساب والبيانات راسل دعم Voira ({{email}}). أدرج البريد المستخدم في التطبيق. الموضوع: Voira Data Deletion Request. ليس حذفاً تلقائياً بنقرة؛ يُتحقق من الطلب ثم يُعالج.',
    afterVerifyBody:
      'بعد طلب موثّق تُحذف أو تُزال هوية البيانات المرتبطة بحسابك مع استثناء الالتزامات القانونية / الأمن / مكافحة الاحتيال / سجلات المعاملات. قد يشمل بيانات الحساب وإن وُجدت التقدم ودفتر المفردات وسجل التحليل.',
    inAppDeleteBody:
      'لحذف حساب مسجّل استخدم الملف الشخصي → حذف الحساب. بعد التأكيد يكتمل الحذف داخل التطبيق.',
  },
  about: {
    whatBody:
      'Voira مدرب تحدث بالذكاء الاصطناعي يحلّل إنجليزيتك ويقيس النطق ويساعدك على تحسين الكلمات الضعيفة بشروحات واضحة.',
    versionBody:
      'يعتمد التحليل على مطابقة الكلمات وتقييم نطق Azure ومقاييس الطلاقة. الدرجات إرشادية وليست شهادة رسمية.',
    contactLegalBody:
      'StudioWebia\nدعم Voira: {{email}}\nسياسة الخصوصية وشروط الاستخدام متوفرة على صفحات الويب.',
    versionLabel: 'Voira v{{version}}',
  },
  support: {
    emailBody:
      '{{email}}\n\nصف المشكلة باختصار؛ ذكر طراز الجهاز وإصدار التطبيق يساعد.',
    topicsBody:
      '• رفض إذن الميكروفون أو عدم بدء التسجيل\n• فشل التحليل أو ظهور خطأ\n• عدم تشغيل صوت الدرس أو فقدان الملف\n• SpeakPlus / الشراء أو استعادة الاشتراك\n• حذف البيانات والخصوصية',
    emailSubject: 'دعم Voira',
  },
} as const;
