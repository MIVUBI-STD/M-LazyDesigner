# Evaluasi sistem MCP dan efisiensi sesi LazyDesigner

Tanggal laporan: 15 Oktober 2026, Asia/Jakarta. Cakupan: baseline dan pengujian Windows yang sudah dilaporkan, kemudian pekerjaan Crimson Sentinel sampai dua animasi dan dua warna dalam satu model. Branch dokumentasi `Local`; HEAD saat evaluasi `e6eac94c1c5547a7b8bfc59362f917fb51a77630`.

**Kesimpulan jujur:** sistem sudah kuat untuk mengeksekusi perubahan data, menjaga UV/tekstur, dan menyimpan hasil. Sistem belum sama kuatnya dalam membuktikan hasil visual, menjelaskan kegagalan native, dan mengerjakan revisi besar dengan sedikit panggilan. Pemborosan juga berasal dari keputusan dan pelaksanaan agen: saya terlalu cepat mengerjakan seluruh aset sebelum mengunci bentuk/gerakan yang tepat, terlalu lama mencoba UI yang gagal, dan beberapa kali menyamakan keberhasilan langkah teknis dengan kemajuan visual.

Laporan ini menyimpan backlog untuk sesi berikutnya. Tidak ada perbaikan source, pemasangan plugin, pengujian ulang menyeluruh, atau publikasi GitHub yang dilakukan sebagai bagian evaluasi ini.

**Pendalaman 15 Oktober 2026:** source dicocokkan pada `15086b69fb971dca744b637e7516a57edcabb6c0` (`Local`, snapshot `3.0`). Bagian pendalaman di bawah memperbarui kepastian diagnosis; observasi sesi sebelumnya tetap terikat pada build yang benar-benar dipakai. Snapshot `3.0` tidak dipindahkan oleh pekerjaan dokumentasi ini. Tidak ada perubahan implementasi atau pengujian native baru. Keterangan tidak ada publikasi pada paragraf sebelumnya menjelaskan evaluasi awal; snapshot/release `3.0` kemudian dibuat atas permintaan terpisah pengguna.

## Cara membaca bukti

Pemeriksaan dokumentasi laporan: `git diff --check` dan `bun run docs:check` lulus. Pemeriksaan freshness memakai Bun lokal 1.3.11, sementara `.bun-version` menetapkan 1.3.14; hasil ini hanya pemeriksaan dokumentasi/generated freshness, bukan source gate canonical atau penerimaan native baru.

- **TERAMATI:** ada perilaku/receipt/artefak sesi yang mendukung kejadian tersebut. Ini belum otomatis menunjukkan akar masalah pada source HEAD sekarang.
- **HISTORIS SUDAH DIPERBAIKI:** hasil pada build tertentu dalam laporan Windows; bukan masalah yang dinyatakan masih terbuka.
- **BELUM TERBUKTI:** dugaan sebab, kompatibilitas, atau hasil yang belum memiliki bukti memadai.
- **USUL PERBAIKAN:** pekerjaan masa depan beserta ukuran keberhasilannya, bukan fitur yang sudah tersedia.

Pemilik bukti tetap [current-validation.md](current-validation.md), prosedur native tetap [local-acceptance-runbook.md](local-acceptance-runbook.md), dan kelanjutan tetap [next-action.md](next-action.md). Penerimaan visual aset tidak menutup klaim runtime produk, kompatibilitas editor, atau Golden benchmark.

## Hasil yang memang berhasil

| Area | Hasil yang didukung bukti | Batasnya |
| --- | --- | --- |
| Source dan instalasi | Source gate awal diperbaiki; build/install dan pengujian Windows tersedia pada SHA/build yang disebut dalam [laporan Windows](native-acceptance.md#consolidated-windows-local-test-report--2026-10-14). | Bukan pengujian semua commit, dan bukan semua skenario lulus pada HEAD saat laporan ini dibuat. |
| Model akhir | Proyek native terakhir melaporkan 179 Cube, 16 Group. UV, geometri, dan animasi lama dipertahankan dalam pemeriksaan revisi akhir. | Bukan pembuktian collision seluruh permukaan pada semua pose. |
| Animasi | Staff slam 4,4 detik dan shatter collapse 8 detik tersimpan. Pengguna menyetujui hasil sebelum meminta simpan. | Bukti pose/GIF berbeda dari verifikasi continuous playback dan Minecraft. |
| Varian warna | Satu `.bbmodel`, dua atlas 512×512, UV yang sama. Pergantian merah/biru teramati pada proyek native yang sama. | Varian biru siap ditinjau; tidak dibuat klaim penerimaan visual baru dari pengguna. |
| Transaksi tekstur | Penggantian 33 warna/25.550 piksel dilakukan dalam satu transaksi Undo. Warna merah dipulihkan identik, lalu biru dipertahankan sebagai explicit variant. | Ini contoh efisien yang perlu dipertahankan, bukan alasan menambah layer authoring baru. |

## Angka pemakaian yang benar benar tersedia

Log parsial `workspace/active/crimson-sentinel-reference/mcp-results.jsonl` mencatat periode 15 Oktober 00:34:47–02:25:03 WIB. Log ini hanya mencakup jalur custom client lama. Panggilan Gateway langsung yang lebih akhir, UI, shell, pembacaan source, dan web tidak tercakup seluruhnya.

| Ukuran | Hasil |
| --- | ---: |
| Record panggilan dalam log parsial | 492 |
| `paint_texture_transaction` | 148 |
| `capture_model_views` | 64 |
| `manage_animation_timeline` | 63 |
| `manage_cubes` | 52 |
| `reparent_element` | 32 |
| `export_model` | 30 |
| `list_textures` | 14 |
| Record dengan flag error yang terdeteksi | 10 |
| Image block yang tersimpan | 543 |
| Ukuran log | 43.017.467 byte, sekitar 41,0 MiB |
| Karakter base64 gambar dalam log | 40.616.988, sekitar 94,4% ukuran log |
| File dalam folder aset saat dihitung | 439 |
| Total ukuran folder aset | 85.880.516 byte, sekitar 81,9 MiB |

Angka ini tidak membuktikan 492 panggilan semuanya boros. Sebagian merupakan pekerjaan sah dan revisi yang diminta pengguna. Biaya terbuang terlihat dari percobaan gagal berulang, pekerjaan yang harus dibatalkan, payload yang tidak dibutuhkan, serta banyak panggilan untuk satu maksud revisi.

**Token input/output, biaya uang, cache hit, dan total usage sesi tidak tersedia secara lengkap.** Base64 yang disimpan ke log tidak otomatis ditagihkan sebagai teks kepada model; biaya gambar juga berbeda dari ukuran file. Karena itu tidak ada persentase penghematan token atau klaim “usage turun sekian persen”. Ukuran file juga bukan penggunaan RAM. Pertanyaan historis tentang 8 GB belum bisa dipastikan sebagai RAM, disk, cache build, atau gabungannya dari angka aset di atas.

## Temuan dan pekerjaan yang perlu dilakukan

### R01 Partikel belum memiliki pembuktian native yang cukup

**Prioritas P1, TERAMATI, belum selesai.** Kedua JSON partikel valid, PNG tersedia, dua keyframe dan locator ada, dan pemuatan preview tidak melaporkan error. Namun pengguna tetap tidak melihat efek. Penautan file dan percobaan memperbesar magic tidak menghasilkan perbaikan visual yang terbukti; percobaan ukuran dikembalikan. Pengguna meminta investigasi dihentikan.

Kesenjangan paling konkret: `manage_animation_effects` menyediakan identifier/locator tetapi tidak menyediakan tautan file preview; `inspect_animation` juga tidak memperlihatkan tautan tersebut. `manage_particle(preview=true)` membuktikan pemuatan dokumen, bukan bahwa emitter sudah terikat pada keyframe, memiliki partikel aktif, teksturnya berhasil didekode, dan terlihat pada waktu/posisi yang dimaksud.

Saya keliru menyampaikan tautan file kosong sebagai penyebab yang sudah menyelesaikan persoalan, lalu meminta pengguna membuka ulang sebelum hasil visual dibuktikan. Itu diagnosis parsial, bukan penyelesaian.

**Perbaikan:** pada capability yang sudah ada, tampilkan diagnostik ringkas identifier → file preview → keyframe → locator → emitter. Bedakan loaded, bound, triggered, particle count, texture ready, muted, dan visibility unknown. Pertahankan pemisahan file preview lokal dari identifier Bedrock. Jangan membuat sistem partikel kedua.

**Syarat selesai:** pada build/editor yang dipastikan, magic dan debu terlihat ketika clip dimainkan, mengikuti locator yang tepat, tersimpan dan muncul lagi setelah reopen. Uji negatif file/PNG hilang, locator salah, channel mute, dan effect tidak terpicu memberi penyebab yang dapat ditindaklanjuti. Mulai dari artefak lokal `workspace/active/crimson-sentinel-reference/vfx/particle-preview-unresolved-report.json`; jangan mengulang saran penautan yang sudah dicoba.

Pemilik awal: `manage_particle`, `inspect_animation`, `manage_animation_effects`; executor `mcp/server/tools/particle/` dan `mcp/server/tools/animation/`. Akar kegagalan render masih BELUM TERBUKTI.

### R02 Pemulihan koneksi masih membingungkan bila profil dan build berbeda

**Prioritas P1, TERAMATI.** Client lama menggunakan profil acceptance; setelah Blockbench utama dibuka, ada `self signed certificate` dan credential missing. Client profil utama yang baru dibuat juga belum menyelesaikan koneksi, sementara connector yang tersedia kemudian dapat memanggil proyek native. Beberapa `status` gagal `ENOENT` karena konteks menunjuk folder lama `D:/Work/AI Stuff/LazyDesigner/.agents/...`, sedangkan workspace aktif bernama `New-LazyDesigner`.

Laporan Windows memakai identitas Runtime `b436485f...` pada release managed. Pemeriksaan health sesi yang lebih akhir menghasilkan `c73fc8c1556af4f92d8d456b7590b671001a3f1e05384cc55ce19672de06e674` dan editor terpasang 5.2.2. Tidak ada dasar untuk menyebut keduanya baseline yang sama atau mengklaim source HEAD saat ini sudah diuji native. Kesalahan ini juga dipengaruhi pemakaian client lama oleh agen, bukan bukti TLS secara umum rusak.

**Perbaikan:** satu orientasi ringkas menunjukkan profile/root, endpoint, trust identity, Runtime build, editor version, proyek, dan provenance konteks. Kegagalan membaca konteks Skill seharusnya dibedakan dari Runtime offline agar capability yang berfungsi tidak ikut dianggap mati. Rebind harus eksplisit dan tepat proyek. Jangan menyelesaikannya dengan mematikan validasi sertifikat atau otorisasi.

**Syarat selesai:** perpindahan profil uji → profil utama menghasilkan diagnosis mismatch yang spesifik dan pemulihan yang terbatas; trusted profile yang benar pulih tanpa menebak direktori atau membuat beberapa client percobaan. Path lama tidak membuat status kesehatan seluruh sistem gagal.

Pemilik awal: Gateway runtime/Control context resolver, konfigurasi managed/Desktop, dan provenance deployment. Verifikasi kesetaraan build sebelum memperbaiki source berdasarkan gejala build lain.

### R03 Revisi animasi lintas banyak tulang terlalu banyak panggilan

**Prioritas P1, TERAMATI.** Satu koreksi gerak memerlukan 30 operasi edit channel untuk 15 bagian. Pemanjangan sinking berikutnya memerlukan 32 channel × delete/create, yaitu 64 operasi. Setiap operasi dapat berhasil sendiri sehingga jumlah transaksi dan beban pemeriksaan meningkat. Clip akhir memiliki 653 transform key; jumlah itu sendiri bukan bukti kualitas, pemborosan, atau kesalahan.

`batch scale` menolak pilihan banyak channel dengan pesan keyframe akan bertumpuk. Kejadian ini nyata pada Runtime sesi. Pendalaman source snapshot `3.0` kemudian menemukan validasi duplikasi waktu secara global pada daftar pilihan lintas animator/channel; probe helper mereproduksi penolakannya. Ini menguatkan diagnosis source, tetapi belum menjadi reproduksi native pada build yang disamakan. Setelah penolakan historis, keadaan diekspor dan dibaca, kemudian hanya rentang akhir ditulis ulang. Tidak dilakukan retry buta.

**Perbaikan:** selidiki penolakan batch per animation/animator/channel, lalu sediakan revisi cohort yang koheren melalui owner timeline yang ada: preflight keseluruhan, satu Undo, apply sekali, dan receipt rentang berubah. Jangan menambah public Gateway tool, evaluator bebas, atau mesin animasi baru.

**Syarat selesai:** waktu yang sama pada tulang/channel berbeda tetap legal; collision pada channel yang sama ditolak tanpa mutasi sebagian. Satu perubahan durasi banyak tulang dapat dilakukan dan di-Undo sebagai satu maksud kerja. Ulangi pada build yang dipastikan, bukan menganggap log lama adalah reproduksi HEAD.

Pemilik awal: `manage_animation_timeline`, `mcp/server/tools/animation/batch.ts`, keyframe execute path, dan validasi collision terkait.

### R04 Ekspor diagnostik mengubah identitas file aktif

**Prioritas P1, TERAMATI.** `export_model(codec_id=project, path=...)` untuk checkpoint diagnostik juga mengubah `project.name`, `save_path`, dan status saved pada receipt. Contohnya proyek berubah menjadi `native-preview-diagnostic`, kemudian harus dikembalikan ke nama canonical. Receipt `control_delta` pada operasi tersebut tetap melaporkan `changed: []` dan `NO_CHANGE`.

Tidak ditemukan kehilangan model akibat kejadian ini. Namun operasi yang dibayangkan sebagai “buat salinan bukti” ternyata berperilaku seperti Save As. Saya seharusnya memperhitungkan efek tersebut sebelum memilih jalur ekspor diagnostik.

**Perbaikan:** jelaskan kontrak save aktif versus export copy; laporkan perubahan metadata proyek dalam delta yang sesuai. Jika ada mode copy, buktikan ia tidak mengubah path/nama/saved state proyek aktif. Jangan menganggap keberhasilan menulis file berarti tidak ada perubahan editor.

**Syarat selesai:** tes before/after metadata, file hasil dan byte integrity, Undo/saved behavior, serta failure cleanup; dokumentasi dan receipt sesuai dengan efek aktual.

Pemilik awal: executor `export_model` dan Gateway control delta. Pertahankan overwrite protection yang sudah berguna.

### R05 Payload dan pencatatan gambar jauh lebih besar dari kebutuhan keputusan

**Prioritas P1, TERAMATI.** Log parsial menyimpan ratusan image block. `list_textures` mengeluarkan contoh UV, coverage, seam, dan metadata panjang saat yang dibutuhkan kadang hanya UUID/revision. Dalam satu panggilan paint saya juga mencetak objek hasil yang berisi base64 melalui jalur teks sehingga output terpotong. Ini kesalahan penggunaan tool oleh agen yang bisa dihindari.

**Perbaikan sistem:** default inventory/receipt ringkas, detail diagnostik diminta menurut scope; gambar dikirim sebagai image/reference, tidak digandakan menjadi teks base64. Simpan file gambar sekali lalu referensikan dari log. Response tetap harus memuat error, revision, area berubah, dan bukti yang diperlukan; jangan menghemat dengan menyembunyikan kegagalan.

**Perbaikan agen:** pilih field hasil yang diperlukan sebelum menampilkannya, gunakan UUID/context/schema yang masih segar, dan jangan meminta audit penuh untuk mutasi deterministik yang receipt-nya sudah cukup.

**Koreksi setelah pemeriksaan source `3.0`:** `mcp/server/tools/texture/read.ts` sudah menetapkan `diagnostics=false` secara default dan mendukung scope diagnostik. Jangan mengimplementasikan fitur yang sudah ada. Payload historis harus dicocokkan dengan argumen request, Runtime/schema revision, dan enrichment/compaction sebelum menentukan pemilik bug.

**Syarat selesai:** ukur byte response, image duplication, jumlah schema/status read, dan call count pada tugas sama. Tidak ada base64 gambar tercetak sebagai prose/tool text; output ringkas tetap cukup untuk memilih langkah berikutnya.

### R06 Bukti pose dan preview belum menggantikan pemeriksaan gerak dan kontak

**Prioritas P1, TERAMATI sebagian.** Keberhasilan `play` pernah tidak diikuti kemajuan waktu yang terlihat pada receipt pause; bukti lain mencatat timeline maju 1,4207 detik ketika foreground. Kondisi berbeda ini tidak membuktikan playback selalu rusak. Memperlihatkan pose/GIF juga tidak membuktikan playback terus-menerus, restore semua state, atau simulasi partikel.

Auto framing antarpose dapat menyamarkan jarak jatuh dan ukuran objek; fixed camera dipakai pada preview revisi akhir. Preview transparan masih memperlihatkan pecahan di bawah tanah; konteks bidang tanah perlu jelas agar pengguna tidak mengira benda melayang. Penghilangan final menggunakan scale exit setelah sinking, bukan bukti material/terrain occlusion di Minecraft.

**Perbaikan:** deklarasikan scope capture, waktu aktual, kamera/bounds, koordinat ground/contact, apakah partikel masuk render, dan state yang dipulihkan. Bedakan command accepted, timeline advanced, pose sampled, continuous playback observed, dan user approved. Gunakan preview kecil yang cukup untuk satu keputusan sebelum merender banyak frame.

Dokumen operasi tetap menyatakan LD-Q04/native restoration sampler diblokir. Sesi memakai `capture_model_views(animation_preview)` untuk bounded pose evidence. Hubungan kontrak kedua jalur itu perlu dijelaskan oleh owner; penggunaan capture tidak menutup gate sampler atau membenarkan bypass.

**Syarat selesai:** jatuh/impact dapat dinilai dengan kamera tetap dan ground yang dinyatakan; posisi kontak dan tidak melayang diperiksa pada pose relevan. Playback diuji dalam kondisi yang direkam, dan state restoration mengikuti gate yang berlaku. Jangan menjanjikan “simulasi gravitasi” dari authored keyframes.

### R07 Revisi visual terlalu mahal karena keputusan authoring saya terlambat

**Prioritas P1 untuk workflow agen, TERAMATI.** Pengguna beberapa kali menolak proporsi, helm, detail armor/batu/belakang, warna emas, kualitas pixel art, tekstur flat, kekakuan gerak, dan cape terlepas. Versi collapse awal memecah bagian sebelum badan jatuh; urutan yang diinginkan ternyata badan rubuh → benturan → pecah → diam dua detik → tenggelam.

Ini terutama kesalahan interpretasi artistik dan motion planning saya. Tool yang berhasil menjalankan keyframes yang salah tidak otomatis merupakan bug MCP. Saya juga terlalu dini mengasumsikan varian biru perlu model terpisah; pengguna kemudian meminta dua tekstur dalam satu model.

**Perbaikan workflow:** tetapkan silhouette/proporsi dari referensi; lakukan blockout sebelum detail. Untuk tekstur, tinjau satu cohort material yang representatif sebelum menyebarkan gaya ke seluruh atlas. Untuk aksi, uji pose antisipasi, kontak, dan akhir dengan envelope gerak kecil sebelum follower/ornamen. Tetapkan apa yang tetap terpasang, bagian yang pecah, ground, jeda, dan ending sejak awal. Jangan menjanjikan kesamaan 1:1 bagian yang tidak dapat diturunkan dari referensi tunggal.

**Syarat selesai:** penolakan visual besar turun pada tugas pembanding yang setara, tanpa menambah pertanyaan konfirmasi berulang. Persetujuan pengguna dan koreksi saat bekerja tetap menjadi otoritas visual.

### R08 Jalur UI dan pencarian fallback belum cukup menghemat percobaan

**Prioritas P2, TERAMATI.** Dialog native/file picker, window minimized/restore, fokus DevTools, indeks accessibility, dan typing beberapa kali tidak menghasilkan tindakan yang diharapkan. Pencarian “developer tools console action” memberi hasil capability yang tidak relevan. Kebingungan file JSON partikel versus PNG tekstur juga membuat pengguna harus mencoba memasang sendiri.

**Perbaikan:** pakai capability native terlebih dahulu; jelaskan tipe file dan perannya. Search yang tidak punya kecocokan harus bisa menyatakan tidak ditemukan, bukan mengangkat hasil lemah sebagai instruksi eksekusi. Hentikan metode UI setelah dua kegagalan yang sama tanpa bukti baru; simpan blocker minimum. Saya terlalu lama bertahan pada metode tersebut.

**Syarat selesai:** tugas authoring normal tidak memerlukan console/DevTools. File picker gagal tidak berakhir dengan keyframe kosong atau input masuk ke panel yang salah. Jangan menonaktifkan peringatan keamanan untuk mempermudah automation.

### R09 UV reuse dan deteksi area belum selesai perlu lebih berorientasi permukaan

**Prioritas P2, perbaikan aset sudah terjadi; celah diagnosis masih ada.** Pengguna menemukan banyak island mirip, detail kecil berlebihan, serta bagian armor yang belum mendapat detail setara. Model akhir lebih ringkas dan varian biru menggunakan UV yang sama. Native inventory akhir menunjukkan 1.074 face, 0 invalid UV, 0 out-of-bounds dan 0 partial overlap; itu hygiene, bukan mutu visual menyeluruh.

Scan coverage yang dipanggil hanya memeriksa 202/1.074 face karena budget, dan menyatakan partial. Detail foto tidak boleh dianggap lengkap dari hasil ini. Exact sharing pun dapat disengaja; jumlah island atau jumlah warna bukan skor artistik.

**Perbaikan:** gunakan semantic material cohorts, UV sharing yang disetujui, dan pemeriksaan permukaan terdampak. Perbarui ledger coverage yang sudah dimiliki workflow, sehingga sisi belakang/underside/joint tidak terlupa. Reuse hasil mapping yang belum berubah, bukan mengaudit seluruh model setelah setiap perubahan warna.

**Syarat selesai:** wajah depan/belakang/samping serta blindspot yang relevan tercakup atau secara eksplisit disengaja; variant alignment tetap ready dan bitmap/UV sama. Detail yang bisa dilukis tidak otomatis dijadikan Cube baru.

### R10 Artefak kerja dan laporan mulai menyulitkan pemulihan keadaan

**Prioritas P2, TERAMATI.** Folder aset memiliki 439 file, banyak frame/GIF/checkpoint dan log 43 MB. Selama kerja README sempat bertambah sebagai riwayat panjang; finalisasi kemudian menulis ulang ringkasan current authority. Ada receipt lama yang tetap menyebut satu tekstur/ukuran file terdahulu setelah model menjadi dua tekstur. Bukti historis sah, tetapi mudah disalahbaca sebagai snapshot terkini.

**Perbaikan:** satu daftar deliverable canonical dan label waktu/revision untuk bukti; pisahkan preview final, scratch, backup, dan receipt historis. Log simpan hash/path gambar, bukan duplikasi payload. Terapkan retensi pada artefak generated yang sudah tidak dibutuhkan, setelah otorisasi yang sesuai; jangan menghapus backup milik pengguna atau cache secara spekulatif.

**Syarat selesai:** chat baru dapat menemukan satu model authoritative, dua tekstur, dua animasi, approval yang berlaku, serta masalah partikel yang ditunda dari ringkasan kecil. Ukuran disk/working set/RAM diukur terpisah sebelum membahas penyebab “8 GB”.

### R11 Biaya pengujian source perlu dipisahkan dari pekerjaan authoring biasa

**Prioritas P2; beberapa penyebab HISTORIS SUDAH DIPERBAIKI.** Baseline awal memiliki 196 kegagalan, termasuk tes/import tertinggal setelah pemindahan modul. Suite gabungan juga mengalami timeout installer dan akhirnya dipisah ke proses Bun yang sesuai. Laporan Windows sudah mencatat owner dan proof; tidak tepat menyebut 196 kegagalan itu masih terjadi sekarang.

**Perbaikan:** pertahankan pengujian penuh untuk baseline source yang memang diminta; gunakan targeted verifier pada source owner yang berubah, reuse bukti exact-SHA/input yang cocok, lalu ulangi native terdampak. Perubahan warna/clip pada aset tidak perlu memicu full source gate. Jangan mengurangi assertion/deadline hanya untuk membuat suite hijau.

**Syarat selesai:** setiap rerun memiliki alasan invalidasi bukti, command, build/SHA, dan scope yang jelas. Durasi CI, setup, dan authoring tidak dicampur sebagai satu angka efisiensi MCP.

### R12 Belum ada pembuktian kuantitatif penghematan usage

**Prioritas P2, BELUM TERBUKTI.** Enam Golden A–F baseline/zero-waste pair belum dijalankan dalam laporan operasi; F belum memiliki reference package yang disetujui. Referensi gambar yang kemudian dipakai pada aset ini tidak otomatis menjadi Golden F resmi atau membuat perbandingan lengkap.

**Perbaikan:** setelah kualitas diterima, bandingkan tugas/input/build yang sama dengan metrik nyata: waktu sampai diterima, call count, failed/retried call, response bytes, human correction count, dan token ketika provider benar-benar menyediakannya. Tanpa data token, simpan null. Jangan mengarang klaim lebih unggul dari produk lain tanpa tugas pembanding.

**Syarat selesai:** hasil lebih murah baru disebut menang jika kualitas dan preservation juga lolos. Instrumentasi cukup pada trace yang sudah ada; tidak perlu database/router/evaluator baru.

## Masalah lama yang jangan dibuka ulang sebagai bug aktif tanpa reproduksi

| Gejala historis | Bukti/status yang sudah dicatat |
| --- | --- |
| Dua pemilik plugin dan jendela command yang berkedip | Perbaikan lifecycle/background helper `b8e791bd`; bounded native startup/reload lulus. Tidak pernah terbukti sebagai Windows BSOD. |
| Setup/discovery/metadata/lease/filter tidak konsisten | Perbaikan pada build yang tercantum di laporan Windows, disertai kasus refusal dan recovery. |
| IPC hang mempertahankan aksi sehat, background health kedaluwarsa | Perbaikan wait/timer; fault/recovery dan minimized checks pada build yang disebut. |
| Desktop pernah menghilang | Sebab kejadian lama masih UNKNOWN; bounded stability/relaunch bukan bukti sebab historis. |
| Source awal 196 gagal dan timeout installer gabungan | Sudah ada source gate sukses pada SHA yang disebut; bukan fresh HEAD proof saat ini. |
| Update editor | Pin versi mengurangi perubahan baseline; 5.2.2 tetap tidak mendapat penerimaan seluruh sistem dari satu keberhasilan aset. |

## Urutan perbaikan berikutnya

Tidak ada backlog di bawah yang otomatis dimulai hanya karena sesi ditutup.

| Urutan | Pekerjaan terbatas | Alasan dan bukti selesai |
| --- | --- | --- |
| 1 | R02: satu baseline/profile/build dan pemulihan status/context | Menghilangkan diagnosis pada instance yang salah; trust dan auth tetap aktif. |
| 2 | R01: satu fixture partikel dengan diagnostik binding/emitter/render | Menutup fungsi yang benar-benar belum terlihat bekerja, termasuk save/reopen. |
| 3 | R03–R04: revisi animasi koheren dan metadata ekspor yang jujur | Mengurangi puluhan panggilan dan risiko perubahan sebagian/path aktif yang mengejutkan. |
| 4 | R05–R06: response/capture ringkas dan bukti gerak yang tepat | Mengurangi konteks/gambar berulang tanpa mengurangi observabilitas. |
| 5 | R07–R10: preview dini, material coverage, UI stop rule, retensi | Mengurangi revisi visual yang dibatalkan serta kebingungan saat resume. |
| 6 | R11–R12: targeted regression dan benchmark berkualitas setara | Membuktikan penghematan setelah fungsi/kualitas benar, bukan sebelumnya. |

## Bukti untuk melanjutkan

- [Laporan Windows historis](native-acceptance.md#consolidated-windows-local-test-report--2026-10-14): baseline, perbaikan source/Desktop/native dan batas proof.
- Ringkasan aset lokal `workspace/active/crimson-sentinel-reference/README.md`: satu model, dua warna dan dua animasi.
- Partikel ditunda, `vfx/particle-preview-unresolved-report.json` relatif terhadap folder aset: hal yang sudah dicoba dan batas diagnosis.
- `shatter-collapse-verification.json` dalam folder aset: hold dua detik, cape attached, preservation, approval. Ukuran model di receipt native_saved adalah snapshot sebelum varian biru, bukan ukuran file dua tekstur terkini.
- `blue-texture-variant-verification.json` dalam folder aset: dua atlas embedded, exact pixel comparisons, geometri/animasi tetap.
- Log parsial dan frame/GIF berada di workspace lokal. Log ini tidak lengkap untuk semua panggilan sesi dan tidak boleh dipublikasikan mentah bersama profil, credential, atau referensi privat.

Penilaian akhir: **keandalan manipulasi data sudah lebih matang daripada observabilitas visual dan efisiensi alur revisinya.** Prioritas terbesar adalah membuat kegagalan dapat dijelaskan dan satu maksud kerja dapat diselesaikan dalam sedikit transaksi; disertai disiplin agen untuk memvalidasi keputusan artistik sebelum mengerjakan detail luas.

## Pendalaman: batas pengetahuan dan fondasi diagnosis

Bagian ini adalah dasar investigasi/perbaikan, bukan instruksi untuk langsung mengeksekusi seluruh backlog. Nomor R01–R12 tetap sama agar pembaca tidak harus memelihara daftar masalah kedua. Jalur source di bawah adalah owner/anchor yang dibaca atau owner kanonis dari implementation map. Jika hanya pemilik awal yang diketahui, hal itu disebut eksplisit; tidak ada klaim setiap jalur sudah dibuktikan bersalah.

### Tingkat kepastian yang harus dibedakan

| Tingkat | Artinya | Klaim yang dibolehkan |
| --- | --- | --- |
| E1: laporan pengguna | Pengguna melihat hasil salah atau tidak menyukai kualitasnya. | Ada masalah pada hasil; belum diketahui apakah kontrak, source, runtime, atau pilihan agen penyebabnya. |
| E2: artefak/receipt sesi | File, timing, error, atau metadata merekam kejadian. | Jalur tertentu menghasilkan keadaan tersebut pada sesi/build itu. Receipt sukses bukan bukti visual. |
| E3: source terpin | Alur implementasi dibaca pada commit tertentu. | Ada perilaku atau celah di source yang dapat dijelaskan. Belum membuktikan source itu sama dengan plugin terpasang. |
| E4: probe terbatas | Fungsi atau kontrak kecil dieksekusi dengan input eksplisit. | Perilaku fungsi/input tersebut teramati; bukan end-to-end atau native proof. |
| E5: native cocok build | Request dieksekusi pada chain Gateway/Runtime/plugin/editor yang dicatat. | Skenario native tersebut dapat dinilai. Tidak otomatis mencakup semua skenario. |
| E6: penerimaan hasil | Pengguna menerima hasil visual pada scope tertentu. | Kualitas diterima untuk hasil tersebut. Bukan bukti kompatibilitas Minecraft, efisiensi token, atau bebas regresi. |

R03 sekarang memiliki E3+E4. R01 memiliki E1+E2 dan source yang menunjukkan batas observabilitas, tetapi akar partikel tidak terlihat belum mencapai E5 yang menjelaskan penyebab. Penerimaan model/animasi tidak mengubah status partikel tersebut.

### Peta proses dan lokasi kegagalan

```text
Maksud pengguna + referensi
  → pilihan bentuk/material/gerak oleh agen                     R07
  → orientasi profile/build/proyek/context                     R02
  → pencarian dan schema capability                            R08
  → request dan scope revisi                                   R03, R05, R09
  → Gateway: affinity, metadata, receipt/delta, compaction      R02, R04, R05
  → Runtime: validasi dan eksekusi domain                      R01, R03, R04
  → Blockbench: Undo, effect binding, emitter, playback/render  R01, R06, R08
  → preview dan penilaian hasil                                R06, R07, R09
  → save/export dan pemulihan artefak                          R04, R10
  → verifikasi berjenjang                                     R11
  → perbandingan biaya pada kualitas setara                    R12
```

Panah adalah urutan tanggung jawab, bukan bukti semua lapisan bermasalah. Contoh: MCP dapat menjalankan request keyframe dengan benar tetapi geraknya buruk karena request agen salah. Sebaliknya, request retiming yang sah dapat ditolak sebelum Undo karena planner membandingkan waktu lintas channel secara keliru. Dua kejadian itu memerlukan perbaikan berbeda.

| ID | Titik pertama yang cukup jelas | Status diagnosis | Dampak utama |
| --- | --- | --- | --- |
| R01 | Receipt load preview berhenti sebelum menjelaskan trigger/emitter/render | Celah observabilitas terbukti; sebab tidak terlihat belum diketahui | Fungsi efek belum terbukti bekerja, percobaan berulang tidak menambah kepastian |
| R02 | Identitas chain/profil/context tidak direkonsiliasi sebelum memakai client | Mismatch/path historis teramati; entrypoint/deployment penyebab harus dipastikan | Diagnosis ke instance salah, status/context gagal meskipun capability lain bekerja |
| R03 | Daftar waktu lintas animator/channel diperiksa sebagai satu himpunan | Mekanisme source + probe helper terbukti pada snapshot | Operasi sah berpotensi ditolak, revisi berubah menjadi puluhan panggilan |
| R04 | Ekspektasi export-copy berhadapan dengan native afterSave | Save lifecycle terbukti di source; makna delta perlu dipastikan | Nama/path aktif berubah, agen salah membaca NO_CHANGE |
| R05 | Kebutuhan keputusan tidak dipisahkan dari payload diagnostik/gambar | Payload historis besar; compact default sudah ada di source | Log/konteks besar dan output terpotong; sebab per request belum dihitung |
| R06 | Keberhasilan sampling dianggap mendekati proof playback/physics | Batas bukti terbukti; tidak ada bug universal playback yang sudah dipastikan | Hasil gerak/contact kurang dapat dinilai, render berulang |
| R07 | Keputusan artistik/urutan aksi diterapkan luas terlalu dini | Kesalahan workflow agen terbukti dari revisi pengguna | Banyak pekerjaan dibatalkan atau dilukis ulang |
| R08 | Fallback UI/search dipertahankan tanpa bukti baru | Kegagalan metode teramati; tidak semua bersumber pada produk | Input salah sasaran, waktu dan usage habis untuk percobaan |
| R09 | Hygiene/coverage parsial disalahartikan sebagai detail visual lengkap | Blindspot dan scan parsial teramati | Permukaan terlupakan, island/detail geometri berlebihan |
| R10 | Artefak historis dan authority akhir bercampur | Banyak artefak serta receipt lama teramati | Resume membaca state usang, storage membesar |
| R11 | Bukti source, build, native dan perubahan aset tercampur | Masalah historis gate sudah diperbaiki; disiplin reuse tetap perlu | Pengulangan verifikasi mahal atau klaim proof salah SHA |
| R12 | Tidak ada baseline biaya yang kualitasnya setara | Kekurangan pengukuran terbukti | Tidak bisa menilai besarnya penghematan atau membandingkan keunggulan |

### Hal yang sudah baik dan wajib dipertahankan

| Kemampuan | Bukti yang tersedia | Mengapa berguna | Jangan dirusak saat optimasi |
| --- | --- | --- | --- |
| Penargetan/preservasi aset | Receipt akhir mencatat geometri/UV, tekstur dan animasi sebelumnya tetap | Revisi tidak harus membangun ulang seluruh aset | Jangan memakai nama ambigu atau mengganti seluruh model untuk koreksi kecil |
| Transaksi paint | 33 warna/25.550 piksel dalam satu Undo; bitmap merah dipulihkan identik | Satu maksud perubahan dapat atomik dan dapat dibatalkan | Jangan menggantinya dengan panggilan per piksel/per warna tanpa kebutuhan |
| Varian tekstur | Dua atlas di satu model; alignment dan kesamaan bitmap dicek | UV/geometri/animasi tidak perlu digandakan | Jangan membuat model terpisah untuk varian yang hanya beda warna |
| Ekspor berkas | Executor memeriksa path, overwrite consent, ukuran dan native lifecycle | Mengurangi overwrite diam-diam dan keberhasilan palsu | Jangan melewati native lifecycle atau overwrite protection untuk memudahkan copy |
| Load partikel terpisah dari authoring PNG | Owner JSON, bitmap, dan timing sudah terpisah | Mencegah beberapa mesin authoring melakukan hal sama | Jangan membangun sistem partikel/paint kedua karena diagnosis preview kurang |
| Context handle | Content hash dan semantic dependency revision sudah ada | Konteks yang masih cocok dapat digunakan kembali | Jangan mengganti identitas/revision dengan ringkasan AI yang tidak dapat diverifikasi |
| Pembatalan/Undo batch | Source batch sudah menempatkan preflight sebelum Undo dan cancel pada kegagalan apply | Fondasi revisi aman sudah tersedia | Perbaiki scope collision; jangan menghapus guard atau rollback |
| Pembatasan proof | Dokumen membedakan user approval, source gate dan native evidence | Menghindari rilis tampak lebih teruji daripada faktanya | Jangan menyamakan prerelease/snapshot dengan quality gate penuh |

Keunggulan di tabel ini adalah keunggulan internal yang didukung bukti, bukan klaim mengalahkan software lain. Tidak ada benchmark pembanding produk lain.

## Kartu investigasi teknis per temuan

### R01 — rantai efek partikel putus di mana?

**Ekspektasi:** clip memicu magic saat mengangkat tongkat dan debu setelah impact; PNG cocok dengan efek dan locator. **Aktual:** JSON/keyframe/locator/file binding ada, load tidak melaporkan error, pengguna tetap tidak melihat efek.

Rantai yang harus dibuktikan satu per satu:

1. File JSON terbaca dan identifier cocok dengan efek yang dimaksud.
2. Texture reference mengarah ke PNG yang benar; decoder selesai dan bitmap bukan transparan seluruhnya.
3. Local preview file terikat pada data point keyframe yang tepat. Identifier Bedrock dan file preview lokal mempunyai peran berbeda.
4. Animation, effects channel, keyframe time, dan locator yang aktif benar.
5. Timeline benar-benar melewati waktu trigger dalam mode yang mendukung emitter; sample satu pose tidak otomatis memicu efek.
6. Emitter dibuat, tidak mute, lifetime/rate/visibility expression menghasilkan partikel.
7. Particle count, posisi world, ukuran/bounds, material/alpha dan kamera membuatnya terlihat.
8. Save/reopen mempertahankan binding dan perilaku tersebut.

**Bukti source:** [particle/inspection.ts](../../mcp/server/tools/particle/inspection.ts) memanggil `Animator.loadParticleEmitter(path, content)`. [particle/manage.ts](../../mcp/server/tools/particle/manage.ts) menangkap exception pemanggilan tersebut dan mengembalikan `preview_path`/`preview_error`; tidak ada pembuktian particle count atau pixel visibility di jalur itu. `preview_error=null` hanya berarti pemanggilan tidak melempar exception yang tertangkap, bukan seluruh proses asinkron berhasil.

[animation/effects.ts](../../mcp/server/tools/animation/effects.ts) mempunyai schema strict untuk effect/locator/time dan tidak menyediakan authoring local preview file. [animation/inspection.ts](../../mcp/server/tools/animation/inspection.ts), pada proyeksi data point particle, tidak mengembalikan file. Namun [effectState.ts](../../mcp/server/tools/animation/effectState.ts) **sudah menyimpan dan mempertahankan file yang ada** pada snapshot/serialization. Jadi kelirunya bukan “sistem sama sekali tidak mengenal file”; celahnya ada pada akses authoring/inspection dan diagnosis end-to-end.

**Yang tidak boleh disimpulkan:** menambahkan field file pasti menyelesaikan render. Laporan `vfx/particle-preview-unresolved-report.json` sudah mencatat binding dipertahankan dalam native export dan efek tetap tidak terlihat. Menautkan ulang file saja tidak cukup sebagai eksperimen berikutnya.

**Eksperimen minimum ketika diaktifkan kembali:** satu fixture disposable, satu animation, satu locator, satu keyframe, satu PNG yang diketahui tidak transparan, satu emitter sederhana. Catat tiap tahap di atas tanpa mengubah rate/size/warna sekaligus. Jika tahap load lulus tetapi emitter tidak muncul, diagnosis berhenti pada trigger/emitter; jangan memoles texture. Jika emitter aktif tetapi tidak terlihat, arahkan pemeriksaan ke material/bounds/kamera.

**Tes yang dibutuhkan:** file hilang, PNG rusak, identifier mismatch, locator hilang, channel mute, trigger tidak dilewati, emitter dengan lifetime nol, dan reload/reopen. Kegagalan file tidak boleh dilaporkan sebagai Runtime offline; kegagalan preview tidak boleh menyembunyikan write JSON yang sudah terjadi. Kasus timeout tetap inspeksi state sebelum retry.

**Proof penutup:** kedua efek terlihat di viewport pada waktu/locator yang tepat dan setelah reopen, disertai build/editor identity dan diagnosis negatif yang spesifik. Tidak perlu physics engine atau tool publik baru. Investigasi native tetap ditunda sampai diminta; laporan ini tidak mengaktifkannya kembali.

### R02 — mismatch client, profil, runtime dan context

Ada sedikitnya tiga identitas yang sebelumnya tercampur: profil pengujian acceptance, profil Blockbench utama, dan lokasi repository/context. Koneksi suatu client yang gagal TLS/credential tidak membuktikan Runtime pada client lain mati. `ENOENT` context juga berbeda dari koneksi TCP/TLS yang gagal.

**Source anchor:** [contexts.ts](../../mcp/gateway/control/contexts.ts), `repoFile()` dan `contentHandle()`. Source development menghitung root relatif terhadap lokasi module; compiled Bun memakai direktori executable. `contentHandle()` melakukan `stat` lalu `readFile`. Bila file tidak ada, fungsi itu dapat melempar; apakah exception menggagalkan seluruh status ditentukan caller dan harus diperiksa sebelum diperbaiki. Source ini tidak membuktikan string path lama di-hardcode di resolver.

**Hipotesis yang masih bersaing:** executable/context package lama; client lama menunjuk entrypoint lama; instalasi paket kehilangan context; argumen client memilih profil salah; trust/cert benar untuk profil lain. Masing-masing memerlukan bukti entrypoint/argv dan provenance paket, bukan tebakan folder.

**Paket diagnosis minimum:** client/transport identity; managed profile; executable/package root; endpoint; trust fingerprint atau status trust tanpa kunci/token; Gateway dan Runtime build identity; editor version; project UUID; authoring surface; context path/revision; error class tiap lapisan. Jangan menyalin credential ke laporan.

**Percabangan tindakan:** trust mismatch → cocokkan profil/CA resmi; credential absent → recovery profil yang berwenang; Runtime offline → koneksi/lifecycle; project mismatch → affinity refusal; context missing → paket/path context. Masing-masing punya pemulihan berbeda. Tidak ada langkah `rejectUnauthorized=false`, mematikan TLS, atau mencoba semua profil.

**Tes penutup:** jalankan profil A dan B dengan trust berbeda, hubungkan client A ke B dan pastikan refusal jelas; pindahkan cwd dan pastikan managed context tidak bergantung cwd; hilangkan satu context file di fixture paket dan pastikan error tidak menyamar sebagai Runtime offline. Setelah pulih, satu request read-only harus menunjuk project UUID/build yang diharapkan. Sesi lampau tidak cukup untuk mengklaim build snapshot `3.0` sudah lulus tes ini.

### R03 — akar penolakan retiming lintas tulang

**Alur source yang ditemukan:** [batch.ts](../../mcp/server/tools/animation/batch.ts) mengumpulkan `Object.values(animation.animators).flatMap(animator => animator.keyframes)`, memfilter animation lalu memilih keyframe. Pada `operation === "scale"`, semua pilihan dipetakan ke `plannedTimes` menggunakan `Timeline.snapTime(...)`, kemudian dipanggil `requireValidPlannedKeyframeTimes(plannedTimes, ..., true)`.

[batchPlanning.ts](../../mcp/lib/animation/batchPlanning.ts) memakai `new Set(times).size !== times.length`. Identitas animator dan channel tidak diterima helper tersebut. Akibatnya, dua keyframe pada tulang berbeda atau channel berbeda dengan waktu hasil sama tidak dapat dibedakan dari collision dalam channel yang sama. Penolakan terjadi sebelum `Undo.initEdit`, sehingga jalur penolakan ini sendiri tidak menunjukkan mutasi sebagian.

**Probe yang benar-benar dijalankan pada snapshot:** Node mengimpor helper TypeScript dan menguji `[1,1]` dengan duplicate guard aktif → rejected dengan pesan yang sama; `[1,2]` → accepted. Label “different bones/channels” pada probe menjelaskan bagaimana caller meratakan input, bukan berarti helper menerima objek bone. Tidak ada `Timeline.snapTime` native, editor, Undo, atau pipeline Gateway yang dieksekusi oleh probe.

Reproduksi helper dari root repo memakai Node 24, tanpa memodifikasi aset/source:

```powershell
node --input-type=module -e '
import {requireValidPlannedKeyframeTimes} from "./mcp/lib/animation/batchPlanning.ts";
for (const times of [[1, 1], [1, 2]]) {
  try {
    requireValidPlannedKeyframeTimes(times, "Batch keyframe scale", true);
    console.log(JSON.stringify({times, result: "accepted"}));
  } catch (error) {
    console.log(JSON.stringify({times, result: "rejected", error: error.message}));
  }
}'
```

Untuk membuktikan caller, fixture berikutnya harus benar-benar membangun animator A/rotation t=1 dan animator B/rotation t=1, memilih keduanya, kemudian memanggil operasi scale. Dua angka dalam helper saja tidak menguji identitas itu. Expected baseline: helper menolak `[1,1]`; expected sesudah perbaikan: planner per track menerima dua track tersebut, sementara helper/guard untuk duplicate dalam satu track tetap melindungi collision.

**Diagnosis source:** scope keunikan waktu terlalu luas untuk input pilihan lintas animator/channel. Ini lebih kuat daripada sekadar dugaan. Hubungannya dengan incident Runtime lama masih memerlukan build parity dan native fixture; jangan menyebut seluruh error retiming pasti satu penyebab.

**Mengapa tes lama belum cukup:** [animation-mutation-contract.test.ts](../../mcp/tests/animation-mutation-contract.test.ts), kasus `batch offset/scale plans stay inside native keyframe time bounds`, menguji helper menolak `[1,1]` dan keberadaan string source. Tes itu tidak menyediakan dua animator/channel berbeda sehingga tidak membuktikan scope collision yang benar. Batas waktu `0..10000` dan guard collision masih bernilai; yang perlu ditambah adalah konteks per track.

**Unit kegagalan yang benar:** `(animation UUID, animator UUID, channel, snapped target time)`. Toleransi/snap harus mengikuti native contract. Keyframe pada track lain legal pada waktu sama. Collision hasil scale dalam track yang sama dan collision dengan keyframe nonselected harus mempunyai kebijakan eksplisit; jangan menghapus semua guard agar batch tampak lolos. Source sesudah preflight memakai native `replaceOthers` dan melaporkan overwrite count; pertahankan kepemilikan native/Undo dan definisikan replacement yang disengaja.

**Rencana perbaikan minimum:** grouping/preflight pada planner yang sudah ada, kemudian satu transaksi apply. Cohort transform yang lebih umum hanya ditambah jika kasus edit yang tidak tercakup batch tetap terbukti mahal; tidak perlu langsung membuat API generik baru untuk menyelesaikan salah scope validasi.

| Fixture regresi | Hasil yang diwajibkan |
| --- | --- |
| Dua bone, rotation masing-masing t=1; factor=1 | Legal; tidak ditolak sebagai duplicate lintas bone |
| Satu bone, rotation dan position masing-masing t=1 | Legal; channel berbeda |
| Satu track dengan waktu berbeda yang snap ke waktu sama | Refusal sebelum mutasi, atau kebijakan replacement eksplisit yang diuji; tidak hilang diam-diam |
| Target bertemu keyframe nonselected di track sama | Kebijakan native replacement/overwrite count dan Undo terbukti |
| Factor/pivot menghasilkan waktu invalid | Ditolak sebelum Undo/apply |
| Exception pada apply di tengah pilihan | Rollback memulihkan keyframe, tangent dan state yang dimiliki operasi |
| Undo/redo batch lintas bone | Satu maksud revisi dipulihkan utuh; animation lain tidak berubah |

**Ukuran efisiensi:** bandingkan maksud retiming sama yang dahulu memerlukan 64 delete/create dengan satu batch yang benar-benar ekuivalen. Jangan mengklaim seluruh 64 call dapat diganti sebelum interpolasi, tangent, hold, endpoint, dan preservation juga cocok. Total 653 keyframe bukan alasan menghapus keyframe tanpa menilai gerak.

### R04 — Save As, export-copy dan arti NO_CHANGE

**Perilaku yang sudah pasti di source:** [io/export.ts](../../mcp/server/tools/io/export.ts) menyimpan sementara `Project.save_path`/`name` saat compile project, memulihkannya dalam `finally`, menulis file, memverifikasi ukuran, lalu memanggil `codec.afterSave(path)`. Receipt memuat lifecycle `project` sesudah native save. Tahap pemulihan compile tidak berarti operasi akhir adalah export-copy; `afterSave` memang bagian lifecycle save.

**Dua persoalan yang harus dipisah:** (a) ekspektasi agen “salinan diagnostik” tidak cocok dengan kontrak save native; (b) presentasi delta dapat membuat agen mengira metadata editor tidak berubah. Tidak ada bukti kehilangan data, dan `afterSave` tidak boleh dihapus hanya untuk menyembunyikan efek metadata.

**Nuansa source delta:** [manifest.ts](../../mcp/lib/capabilities/manifest.ts) mengklasifikasikan `export_model` sebagai `EXPORT`. [delta/freshness.ts](../../mcp/gateway/control/delta/freshness.ts) memisahkan mutation dari operation class lain. `NO_CHANGE` merupakan proyeksi freshness, tidak otomatis janji byte-for-byte seluruh state editor sama. Laporan lama yang menempatkan NO_CHANGE berdampingan dengan perubahan path harus dibaca sebagai celah semantik/presentasi yang perlu dikonfirmasi, bukan bukti bahwa geometry/texture freshness salah.

**Keputusan kontrak sebelum coding:** apakah tool ini hanya save/export sesuai native lifecycle dengan dokumentasi lebih jelas, atau perlu mode copy yang benar-benar terpisah? Pilih minimum kebutuhan. Jika copy tersedia/ditambah, jangan gunakan source path aktif sebagai tujuan tanpa consent. File identity harus tetap diketahui agen meskipun authoring evidence masih fresh.

**Tes minimum:** snapshot `name/save_path/export_path/export_codec/saved`, compile-only, save project ke path baru, overwrite ditolak/diizinkan, codec tidak punya afterSave, exception compile, gagal write, serta metadata tidak sinkron sesudah write. Bukti file tertulis tetapi lifecycle gagal harus dilaporkan sebagai keadaan campuran, bukan aman untuk retry buta. Verify isi/embedded texture dan path aset relatif; ukuran file saja bukan pemeriksaan seluruh isi.

**Selesai bila:** caller dapat memprediksi apakah file aktif berpindah dan menerima receipt yang konsisten; operasi copy, jika memang diperlukan, tidak mengubah identitas aktif. Tidak perlu membatalkan freshness visual untuk save yang tidak mengubah penampilan.

### R05 — mana payload sistem, mana pemborosan agen?

**Source yang sudah baik:** [texture/read.ts](../../mcp/server/tools/texture/read.ts) menetapkan inventory default dan opt-in diagnostic scopes. `io/export.ts` meniadakan echo content secara default saat `path` dipakai; `particle/manage.ts` juga membatasi content sesudah verified write. Jadi usulan “buat semua default ringkas” harus diawali audit kasus nyata, bukan menulis ulang owner yang sudah melakukannya.

**Empat jalur berbeda yang harus dihitung:** response teks yang masuk konteks; image block yang benar-benar dikirim ke model; log lokal yang menyimpan image base64; dan biaya iterasi akibat keputusan yang salah. Ukuran log hanya mengukur jalur ketiga. Satu frame dapat hadir di file PNG, structured result dan log tanpa otomatis tiga kali ditagihkan; sebaliknya print base64 sebagai teks memang dapat menciptakan payload teks yang tidak diperlukan.

**Bukti yang masih kurang untuk setiap kasus verbose:** argumen `diagnostics`, `diagnostic_scope`, request detail mode, schema/build identity, raw Runtime response, output sesudah [resultCompaction.ts](../../mcp/gateway/presentation/resultCompaction.ts), serta bagian yang akhirnya diteruskan agen. Jangan menyalahkan compactor bila agen sengaja meminta `full`; jangan menyalahkan request jika installed build belum punya schema compact.

**Eksperimen minimum:** jalankan inventory dengan default, scoped diagnostics untuk satu kebutuhan, full hanya sekali sebagai pembanding; hitung text bytes, structured bytes, image count dan total bytes secara terpisah. Bandingkan hanya request yang kualitas keputusannya ekuivalen. Tanpa telemetry provider, kolom token/cost tetap null.

**Perbaikan agen tanpa perubahan source:** jangan `text(result)` untuk result berisi image; pilih metadata kecil dan forward image melalui jalur media yang sesuai. Reuse UUID/revision/context handle selama belum invalid. Untuk mutation deterministik, verifikasi checksum/revision lebih berguna daripada merender seluruh model lagi.

**Regresi yang harus dicegah:** compact response menghilangkan error, partial/unknown flag, revision, artifact path atau perubahan state; gambar tidak dapat ditelusuri ke waktu/build; retry akibat receipt terlalu minim. Optimasi yang membuat diagnosis lebih sulit bukan kemenangan.

### R06 — gerak hidup, kontak dan pembuktian playback

**Kebutuhan artistik:** magic membangunkan patung, badan tidak serentak kaku, tongkat menghantam kuat, cape mengikuti, tubuh rubuh ke depan sebelum pecah, kain tetap melekat, pecahan diam dua detik lalu tenggelam. Ini authored motion, bukan solver gravitasi.

**Yang sudah dibuktikan artefak:** `shatter-collapse-verification.json` mencatat impact 1,8; settled 2,8; hold 2,8–4,8; sink 4,8–8 detik; cloth offset lokal nol dan hold keys identik. Nilai lokal nol tidak sendirian membuktikan semua cloth world position benar, tetapi bersama hierarchy dan pose merupakan pemeriksaan attachment yang relevan. Approval pengguna berlaku pada hasil yang ditinjau.

**Source anchor tambahan:** [runtime/contracts/animation.ts](../../mcp/server/runtime/contracts/animation.ts), `captureAnimationSamples()`, membungkus capture pada `withTemporaryAnimationPreview` per sample. Hasil mencantumkan sample count dan state-restored. [inspection/camera.ts](../../mcp/server/tools/inspection/camera.ts) tetap owner base camera/capture. Jangan mencari seluruh perilaku animation preview hanya di base tool; extension composition adalah bagian kontraknya.

**Batas diagnosis:** pemanggilan helper restore di source tidak menggantikan native restoration proof. Sampling pose tidak membuktikan timer berjalan, emitter terpicu, kontak sepanjang interval, atau playback background. Status sampler LD-Q04 tetap terpisah. Preview GIF juga dapat mempunyai durasi frame/pause review yang berbeda dari timing clip.

**Fixture minimum:** tampilkan ground/koordinat contact yang jelas dan kamera tetap; sampel antisipasi, titik lepas keseimbangan, sebelum/tepat/sesudah impact, akhir hold, tengah sink, endpoint. Cek collision hanya pada pasangan/permukaan relevan, bukan klaim semua mesh bebas penetrasi. Bandingkan preview foreground/background dengan kondisi OS/editor yang dicatat bila itu bagian dugaan bug.

**Tes restore:** sebelum/sesudah animation terpilih, Timeline time/playing, camera, selection dan state sementara yang dimiliki helper; exception di sample tengah juga harus restore. Terpisah dari tes itu, amati continuous playback pada build cocok. Tidak ada status `play accepted` yang otomatis dinaikkan menjadi `motion observed`.

### R07 — kesalahan keputusan authoring yang bukan bug MCP

Urutan kejadian menunjukkan revisi pengguna berulang pada material/helm, penyatuan warna, blindspot, rasa berat gerak, timing pecah dan attachment kain. Tool berhasil bisa tetap menghasilkan aset buruk jika request yang saya susun salah. Menambah capability tidak memperbaiki keputusan warna atau urutan aksi yang keliru.

**Pemilik:** cara agen memakai specialist dan stage context yang sudah ada. Tidak otomatis membutuhkan Skill baru atau source rewrite. Bedakan permintaan tambahan yang baru muncul dari hal yang sebenarnya sudah jelas tetapi saya abaikan. Tambahan kebutuhan yang sah bukan seluruhnya waste.

**Prosedur yang lebih hemat:** turunkan landmark/proporsi yang terlihat dari referensi; buat blockout kecil dan bandingkan; gunakan satu sampel representatif emas/kain/batu dengan rentang shadow/highlight yang disetujui; perluas gaya hanya setelah cocok. Untuk animasi, tetapkan action beats, ground, attachment dan ending; periksa tiga sampai beberapa pose penentu sebelum puluhan follower keys. Gunakan arahan pengguna yang sudah ada tanpa meminta approval sama berulang.

**Kasus konkret:** permintaan dua warna semestinya memicu pemeriksaan apakah hanya bitmap variant; tidak langsung menggandakan `.bbmodel`. Permintaan patung rubuh semestinya memperjelas urutan badan jatuh → contact → fracture; bukan memulai animasi pecahan terbang. Emas lebih tua dan shadow 30–40% adalah arah artistik pengguna, bukan formula luminance universal yang boleh diterapkan tanpa melihat hasil.

**Ukuran hasil:** jumlah koreksi besar setelah detail massal; jumlah mutation yang dibatalkan karena salah interpretasi; jumlah pertanyaan berulang; waktu sampai kualitas diterima. Jangan mengukur keberhasilan hanya dari semakin sedikit pertanyaan atau semakin sedikit cube.

### R08 — batas fallback UI dan pencarian

Pisahkan capability absent, schema salah, tool error, dialog keamanan, file picker, focus/minimized dan input manusia. Semua dapat terasa seperti “tidak bisa dipasang” tetapi tidak punya perbaikan sama. JSON adalah definisi partikel; PNG adalah bitmap, bukan file pengganti pada picker definisi.

**Pemilik awal:** search/ranking Gateway bila hasil lemah dipromosikan sebagai capability cocok; native UI adapter bila identitas kontrol terbukti salah; agen bila menebak target, memakai indeks usang, atau mengulang cara gagal. Akar ranking/accessibility masing-masing belum dibuktikan pada source. Tidak boleh membuka pekerjaan search engine baru dari satu query yang buruk.

**Prosedur:** orientasi UI sekali, satu tindakan tepat sasaran, inspeksi hasil. Setelah dua kegagalan sebab sama tanpa bukti baru, berhenti pada metode itu. Jika input pengguna menginterupsi, tidak menafsirkan timeout sebagai keberhasilan. Hindari DevTools sebagai jalur authoring normal dan pertahankan dialog keamanan.

**Acceptance:** salah tipe file memberi pesan yang menjelaskan peran dan field tujuan; pencarian yang tidak cocok tidak memberi instruksi menyesatkan; cancel dialog tidak mengubah keyframe; tindakan berhasil diverifikasi pada state tujuan. Jumlah percobaan UI dicatat terpisah dari call MCP.

### R09 — hygiene UV bukan kualitas tekstur

**Empat hal berbeda:** UV valid; UV sharing sengaja; bitmap memiliki detail pada material yang tepat; model terlihat baik dari sudut relevan. Nol OOB/invalid/partial-overlap hanya membuktikan subset hygiene yang diperiksa. Exact shared UV bisa benar; overlap yang tak sengaja bisa salah. Pendeteksi tidak boleh menyamaratakan keduanya.

**Kasus sesi:** 202/1.074 face diperiksa pada scan bounded. Sekitar 18,8% adalah proporsi face yang discan, **bukan** proporsi area visual atau persentase model yang “selesai”. Satu face besar dan satu face kecil mempunyai bobot visual berbeda. Blindspot underside yang dibawa pengguna menunjukkan audit front saja tidak cukup.

**Pemilik:** cohort/mapping dan coverage evidence pada texture/UV owners; keputusan apakah detail artistik cukup tetap agen/pengguna. [texture/read.ts](../../mcp/server/tools/texture/read.ts) dan owner `texture-atlas` menjadi entrypoint inspeksi, bukan alasan menambah ledger/database lain.

**Perbaikan minimum:** klasifikasi material/part/surface yang dimaksud, reuse island hanya untuk bagian yang memang sepadan, inspeksi sisi belakang/underside/joint yang belum terbukti. Setelah palette-only edit, mapping yang tidak berubah tidak perlu dipack ulang. Jangan menghemat atlas dengan memaksa semua face berbagi motif yang membuat arah cahaya/ornamen salah.

**Tes penutup:** variant pixel mapping, unchanged UV, intentional sharing, blindspot yang dilaporkan, rotasi/mirroring island yang relevan, bleed/seam pada skala pemakaian. Simpan scanned/total, partial reason dan affected scope. Jangan menutup seluruh coverage dari bounded scan atau menaikkan texture resolution untuk menutupi UV buruk.

### R10 — pemulihan state dan pertumbuhan disk

**Titik kegagalan:** banyak checkpoint/receipt tetap ada setelah authority berpindah; pembaca berikutnya dapat mengambil receipt satu tekstur sebagai keadaan model dua tekstur. Root cause organisatoris ini berbeda dari memory leak. Model akhir 478.576 byte pada waktu penyatuan dua tekstur tidak sama dengan ukuran semua frame/log atau cache toolchain.

**Authority yang harus dipakai:** README aset menunjuk `.bbmodel` akhir, atlas, animation ID, approval state dan deferral. Receipt historis tetap berguna jika diberi waktu/revision dan tidak dibaca sebagai current. Sesudah source snapshot, commit/tag menjadi authority source; runtime identity masih terpisah.

**Bukti tambahan snapshot:** branch/tag `3.0` menyimpan source serta kedua workspace aset. Dua `mcp-results.jsonl` dikecualikan publikasi dan diabaikan Git; ZIP privat aset 72.571.247 byte disimpan lokal, SHA-256 `9071d157ab9a08d5af44e0d7cf9f0e7c596993d86d70466f3288e40487b94f6e`. Arsip source release 46.440.835 byte berbeda scope. Ukuran itu tidak boleh dijumlahkan sebagai kebutuhan minimum aplikasi atau penggunaan RAM.

**Jawaban yang belum ada untuk 8 GB:** perlu mengetahui apakah pengguna mengukur working set/RAM, disk folder source, Rust target, dependency, managed version history, atau total proses. Ukur pemilik direktori/proses sekali sebelum menyarankan penghapusan. Tidak ada memory profiler atau diagnosis leak dalam laporan ini.

**Perbaikan berikutnya:** kebijakan retensi frame/checkpoint/log berdasarkan current deliverable dan nilai recovery; arsip lokal terpisah dari publication. Tes restore dari snapshot pada lokasi disposable harus membuktikan model/atlas/animasi dapat ditemukan tanpa path lama, tetapi tidak dijalankan oleh pekerjaan dokumentasi ini. Tidak ada deletion yang diotorisasi otomatis oleh laporan.

### R11 — verifikasi yang tepat sasaran dan bukti yang tidak dicampur

**Masalah historis:** 196 kegagalan awal mencakup assertion/import yang tertinggal setelah pemindahan modul. Setelah source gate diperbaiki, bug tersebut tidak otomatis aktif lagi. Timeout installer gabungan juga mempunyai perbaikan terpisah. Ini bukan alasan melemahkan semua tes yang gagal berikutnya.

**Aturan keputusan:** source/schema/validator berubah → verifier owner dan impact yang nyata; package/build input berubah → artefak terdampak diperbarui; hanya aset berubah → verifikasi aset; hanya laporan berubah → pemeriksaan dokumentasi. Source proof dapat dipakai ulang hanya jika exact source/input cocok. Native claim harus menyebut source/build yang terpasang, bukan sekadar ancestor hijau.

**Kegagalan proses yang perlu dicegah:** membaca log full-suite lama sebagai proof HEAD, menggabungkan PASS berbeda SHA, mengulang full gate setelah palette edit, membangun ulang seluruh Desktop untuk koreksi dokumentasi, atau memperbaiki test dengan menghapus invariant collision yang masih sah.

**Acceptance:** setiap rerun menjawab klaim tertentu dan punya alasan invalidasi; hasil unsupported/blocked/unknown tidak disulap PASS. Toolchain 1.3.11 pada freshness dokumen tetap disebut apa adanya ketika repo pin 1.3.14. Tidak ada full test baru pada pendalaman laporan ini.

### R12 — pembuktian efisiensi yang belum tersedia

**Pertanyaan yang belum dapat dijawab:** berapa token/biaya terbuang; berapa penghematan setelah perbaikan; apakah MCP ini lebih hemat/unggul daripada pembanding; berapa porsi dari total sesi yang merupakan retry teknis versus revisi artistik. Log parsial tidak memuat semua jalur dan tidak memuat token provider.

**Unit pembanding:** satu maksud pekerjaan sampai hasil diterima, dengan aset/input, build, kualitas dan preservation yang sebanding. Batch lebih sedikit call tetapi hasil geraknya salah tidak menang. Banyak call untuk memenuhi tambahan permintaan pengguna tidak otomatis boros.

| Metrik | Cara mencatat | Batas interpretasi |
| --- | --- | --- |
| Logical intent count | Kelompokkan request pada satu maksud pengguna/revisi | Jangan membuat satu intent per call agar tampak efisien |
| Call amplification | Jumlah call yang dibutuhkan untuk satu intent selesai | Bedakan mutation, read, capture, schema, UI dan verification |
| Failed/retried calls | Error class, sebab, retry setelah state inspection atau tidak | Error-flag count tidak sama dengan jumlah semua kegagalan |
| Rework | Operasi/hasil yang dibatalkan beserta alasan | Pisahkan salah agen, bug, dan requirement baru |
| Response bytes | Teks/structured/image/log secara terpisah | Bukan token billing |
| Time to accepted result | Waktu aktif, tunggu tool/UI, dan interaksi manusia | Jeda pengguna tidak otomatis biaya sistem |
| Token/cost/cache | Telemetry provider bila tersedia; selain itu null | Jangan mengestimasi biaya uang dari base64 log |
| Preservation/quality | Invariant data dan penerimaan visual yang relevan | Hygiene score bukan visual approval |

**Pengukuran minimum yang paling berguna:** (a) retime multibone yang sama sebelum/sesudah perbaikan R03; (b) inventory compact vs explicit full untuk keputusan yang sama; (c) particle fixture sampai terlihat; (d) satu material cohort sampai diterima dibanding repaint seluruh atlas; (e) ganti varian memakai model sama. Tidak harus menjalankan seluruh Golden suite untuk membuktikan satu bounded improvement, tetapi klaim full Golden tetap memerlukan seluruh prosedurnya.

**Batas telemetry:** gunakan trace yang sudah ada dan catat metadata minimum. Jangan membangun database, dashboard, summarizer, atau evaluator baru sebelum kebutuhan telemetry yang tidak tercakup terbukti. Tidak boleh mempublikasikan raw credential/private profile demi “laporan lengkap”.

## Urutan tindakan yang dapat langsung dijadikan kontrak perbaikan

R02 adalah prasyarat setiap diagnosis native; R03 mempunyai bukti source yang cukup untuk dimulai secara independen. Tidak perlu menunggu seluruh native particle selesai untuk menulis regression test source R03. Sebaliknya, jangan mengklaim source fix R03 menyelesaikan partikel.

| Paket | Input wajib | Pekerjaan terbatas | Bukti selesai dan kondisi berhenti |
| --- | --- | --- | --- |
| A: identitas, R02 | Snapshot/source target dan chain nyata | Rekonsiliasi profile/entrypoint/build/context, reproduksi mismatch yang relevan | Satu chain diketahui; mismatch diagnosis spesifik; stop sebelum authoring |
| B: collision, R03 | Source terpin, fixture track/time | Tambah tes lintas track; koreksi scope planner; verifikasi Undo/replacement | Targeted source PASS; native hanya bila chain cocok; tidak membuat batch engine baru |
| C: partikel, R01 | Chain A dan fixture minimal | Buktikan load→bind→trigger→emitter→render; perbaiki owner pertama yang salah | Efek terlihat dan reopen; bila blocked simpan tahap gagal, jangan lanjut styling |
| D: metadata ekspor, R04 | Kontrak save/copy yang dipilih | Perjelas save side effects dan receipt/presentation, atau copy bila diperlukan | File/metadata/preservation cocok; tidak mengubah semua freshness scope tanpa alasan |
| E: payload dan preview, R05–R06 | Satu intent dan raw/compacted response terukur | Pakai compact yang sudah ada, koreksi kebocoran yang terbukti, proof gerak dengan scope jelas | Byte/call turun pada kualitas setara; gate sampler tetap dipatuhi |
| F: disiplin authoring/coverage, R07–R09 | Referensi dan koreksi pengguna sebelumnya | Preview kecil, material cohorts, attachment/contact, blindspot relevan | Penolakan besar/rework turun; tidak menambah approval berulang |
| G: pemulihan dan ukuran, R10 | Authority artefak dan sumber angka ukuran | Audit scope storage/memory bila diminta; retention/restore terarah | Recovery terbukti, tidak ada delete tanpa scope; tidak mengklaim diagnosis 8 GB dari tebakan |
| H: pembanding, R11–R12 | Hasil kualitas lulus dan exact input/build | Targeted regression dan benchmark bounded/Golden sesuai klaim | Hanya metrik terukur dilaporkan; token null tetap null |

Setiap paket adalah calon pekerjaan terpisah, bukan mandat menjalankan semuanya sekarang. Perubahan source membuat baseline baru; tag/branch `3.0` tetap menjadi titik pemulihan.

### Format bukti minimum untuk menutup satu temuan

Gunakan owner bukti yang sudah ada, bukan laporan baru per percobaan. Catat: ID temuan; observed/expected; source SHA dan installed build bila native; request/capability beserta scope; fixture disposable; error/state sebelum-sesudah; first wrong owner yang dibuktikan; perubahan source/kontrak yang dilakukan; positive/negative test; Undo/reopen/preservation bila relevan; metrik sebelum-sesudah dengan batas cakupan; serta claim yang masih unknown.

Jangan menandai `DONE` karena file berhasil dibuat, return `success`, screenshot terlihat satu kali, atau jumlah call turun. `DONE` berarti gejala sasaran tidak lagi terjadi pada fixture yang tepat, kasus negatif tetap benar, hasil tidak merusak data lain, dan proof tidak melampaui build/scope yang dijalankan.

### Titik mulai yang paling jelas

**Source defect paling terlokalisasi:** R03, validasi duplicate time kehilangan identitas animator/channel. **Fungsi pengguna yang paling jelas belum selesai:** R01, particle visibility. **Prasyarat native paling penting:** R02, identitas chain/profile/build/context. **Penyumbang rework yang harus saya perbaiki tanpa menyalahkan MCP:** R07 dan R08. **Klaim yang belum boleh dibuat:** penghematan token, full Golden, native HEAD PASS, penyebab 8 GB, atau kesamaan visual 1:1 seluruh sudut.
