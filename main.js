
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // ฟังก์ชันโหลดและแสดง popup จาก Firebase
        async function loadAndShowPopup() {
            try {
                console.log("กำลังโหลดข้อมูล PM2.5...");
                
                // ดึงข้อมูลจาก Firestore
                const querySnapshot = await db.collection("pm25_cmucc").get();
                
                if (!querySnapshot.empty) {
                    // เอาข้อมูลแรกที่พบ หรือสามารถเพิ่มเงื่อนไขในการเลือกข้อมูลได้
                    const doc = querySnapshot.docs[0];
                    const data = doc.data();
                    
                    console.log("ข้อมูลที่ได้:", data);
                    
                    const pm25Value = parseFloat(data.pm25);
                    const timestamp = data.timestamp;
                    
                    // กำหนดสถานะตามค่า PM2.5
                    let status, colorClass, introducetext;
                    if (pm25Value <= 25) {
                        status = 'ดีมาก';
                        colorClass = 'blue';
                        introducetext = 'เหมาะสำหรับกิจกรรมกลางแจ้งและการท่องเที่ยว';
                    } else if (pm25Value <= 50) {
                        status = 'ดี';
                        colorClass = 'green';
                        introducetext = 'ทำกิจกรรมกลางแจ้งได้ตามปกติ';
                    } else if (pm25Value <= 100) {
                        status = 'ปานกลาง';
                        colorClass = 'yellow';
                        introducetext = 'ลดระยะเวลาทำกิจกรรมกลางแจ้ง';
                    } else if (pm25Value <= 200) {
                        status = 'ไม่ดี';
                        colorClass = 'orange';
                        introducetext = 'ควรเฝ้าระวังสุขภาพ';
                    } else {
                        status = 'แย่มาก';
                        colorClass = 'red';
                        introducetext = 'ควรหลีกเลี่ยงกิจกรรมกลางแจ้ง';
                    }
                    
                    // แปลงเวลาเป็นรูปแบบไทย
                    const formattedTime = formatThaiDateTime(timestamp);
                    
                    // อัปเดตข้อความเวลาใน update-time
                    updateTimeDisplay(formattedTime);
                    
                    // สร้างข้อความสำหรับ popup
                    const message = `${introducetext} `;
                    
                    console.log("แสดง popup ค่า PM2.5:", pm25Value);
                    showPopup(pm25Value, status, colorClass, message);
                    
                } else {
                    console.log("ไม่พบข้อมูล PM2.5");
                    updateTimeDisplay("ไม่ทราบ");
                    showPopup(0, 'ไม่ทราบ', 'gray', 'ไม่พบข้อมูลคุณภาพอากาศ');
                }
                
            } catch (error) {
                console.error("โหลดข้อมูล PM2.5 ล้มเหลว:", error);
                updateTimeDisplay("เกิดข้อผิดพลาด");
                showPopup(0, 'ข้อผิดพลาด', 'gray', `เกิดข้อผิดพลาด: ${error.message}`);
            }
        }

        // ฟังก์ชันอัปเดตเวลาแสดงผล
        function updateTimeDisplay(formattedTime) {
            const updateTimeElement = document.getElementById('update-time');
            if (updateTimeElement) {
                updateTimeElement.textContent = `อัปเดตข้อมูลล่าสุด ${formattedTime}`;
            }
        }

        // ฟังก์ชันโหลดข้อมูลจาก Firestore อัตโนมัติ (สำหรับแสดงในหน้าหลัก)
        async function loadData() {
            const container = document.getElementById('dataContainer');
            
            try {
                // ดึงข้อมูลจาก collection ชื่อ "pm25_cmucc"
                const querySnapshot = await db.collection("pm25_cmucc").get();
                
                if (querySnapshot.empty) {
                    container.innerHTML = '<div class="loading">ไม่พบข้อมูล</div>';
                    return;
                }

                let html = '<div class="data-grid">';
                let count = 0;
                let latestTimestamp = null;
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // แสดงข้อมูล pm25 และ timestamp
                    if (data.pm25 !== undefined) {
                        count++;
                        html += createPMCardHTML(doc.id, data.pm25, data.timestamp);
                        
                        // หาข้อมูลล่าสุด
                        if (!latestTimestamp || (data.timestamp && data.timestamp > latestTimestamp)) {
                            latestTimestamp = data.timestamp;
                        }
                    }
                });
                
                html += '</div>';
                
                if (count === 0) {
                    container.innerHTML = '<div class="loading">ไม่มีข้อมูล</div>';
                } else {
                    container.innerHTML = html;
                    
                    // อัปเดตเวลาล่าสุดใน update-time
                    if (latestTimestamp) {
                        const formattedTime = formatThaiDateTime(latestTimestamp);
                        updateTimeDisplay(formattedTime);
                    }
                }
                
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", error);
                container.innerHTML = `
                    <div class="error">
                        <strong>❌ เกิดข้อผิดพลาด:</strong><br>
                        ${error.message}<br><br>
                        <small>กรุณาตรวจสอบ Firebase Configuration และสิทธิ์การเข้าถึง</small>
                    </div>
                `;
            }
        }

        // ฟังก์ชันแปลง timestamp เป็นรูปแบบไทย
        function formatThaiDateTime(timestamp) {
            const thaiMonths = [
                'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
                'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
                'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
            ];
            
            let date;
            
            // ตรวจสอบว่า timestamp เป็น Firebase Timestamp หรือไม่
            if (timestamp && timestamp.toDate) {
                date = timestamp.toDate();
            } 
            // หรือเป็น Date object
            else if (timestamp instanceof Date) {
                date = timestamp;
            } 
            // หรือเป็นตัวเลข (Unix timestamp)
            else if (typeof timestamp === 'number') {
                date = new Date(timestamp);
            }
            // หรือเป็น string ที่สามารถแปลงเป็น Date ได้
            else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            }
            else {
                return 'ไม่ทราบเวลา';
            }
            
            // ตรวจสอบว่า date ถูกต้องหรือไม่
            if (isNaN(date.getTime())) {
                return 'เวลาไม่ถูกต้อง';
            }
            
            const day = date.getDate();
            const month = thaiMonths[date.getMonth()];
            const year = date.getFullYear() + 543;
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
        }

        // ฟังก์ชันแสดง popup 
        function showPopup(pm25Value, status, colorClass, message) {
            const modalOverlay = document.getElementById('modalOverlay');
            const modal = document.getElementById('modal');
            const popupCircle = document.getElementById('popupCircle');
            const popupTitle = document.getElementById('popupTitle');
        
            const popupMessage = document.getElementById('popupMessage');

            // กำหนดสีให้วงกลมใน popup
            popupCircle.className = `circlepopup ${colorClass}`;
            popupCircle.innerHTML = `
                <div>PM 2.5</div>
                <div style="font-size: 2em; font-weight: bold;">${pm25Value}</div>
                <div>${status}</div>
            `;

            // กำหนดข้อความ
            popupTitle.textContent = 'คุณภาพอากาศวันนี้' ;
            
            popupMessage.innerHTML = message;

            // แสดง modal
            modalOverlay.classList.add('show');
            modal.classList.remove('closing');
        }

        // ฟังก์ชันปิด popup
        function closePopup() {
            const modalOverlay = document.getElementById('modalOverlay');
            const modal = document.getElementById('modal');
            
            modal.classList.add('closing');
            setTimeout(() => {
                modalOverlay.classList.remove('show');
                modal.classList.remove('closing');
            }, 300);
        }

        // ปิด popup เมื่อคลิกพื้นหลัง
        document.getElementById('modalOverlay').addEventListener('click', function(e) {
            if (e.target === this) {
                closePopup();
            }
        });

        // ฟังก์ชันสร้าง HTML สำหรับแสดงค่า PM (แก้ไขไม่ให้แสดงเวลาในวงกลม)
        function createPMCardHTML(docId, pmValue, timestamp) {
            // กำหนดสีตามระดับ PM2.5
            let backgroundColor = '';
            let statusText = '';
            let pmNum = parseFloat(pmValue);
            
            if (pmNum <= 25) {
                backgroundColor = '#4FC3F7'; // ฟ้าอ่อน - คุณภาพดีมาก
                statusText = 'ดีมาก';
            } else if (pmNum <= 50) {
                backgroundColor = '#66BB6A'; // เขียว - คุณภาพดี
                statusText = 'ดี';
            } else if (pmNum <= 100) {
                backgroundColor = '#FFCA28'; // เหลือง - ปานกลาง
                statusText = 'ปานกลาง';
            } else if (pmNum <= 200) {
                backgroundColor = '#ff8c00'; // ส้ม - เริ่มมีผล
                statusText = 'เริ่มแย่';
            } else {
                backgroundColor = '#EF5350'; // แดง - มีผลกระทบ
                statusText = 'แย่มาก';
            }
            
            return `
                <div class="circle" style="background-color: ${backgroundColor};" onclick="showDetailPopup('${pmValue}', '${statusText}')">
                    <div>PM 2.5</div>
                    <div class="pm-value" style="color: black; font-weight: bold; font-size: 2em;">${pmValue}</div>
                    <div>${statusText}</div>
                </div>
            `;
        }

        // ฟังก์ชันแสดง popup เมื่อคลิกที่วงกลม
        function showDetailPopup(pmValue, status) {
            let colorClass, introducetext;
            let pmNum = parseFloat(pmValue);
            
            if (pmNum <= 25) {
                colorClass = 'blue';
                introducetext = 'เหมาะสำหรับกิจกรรมกลางแจ้งและการท่องเที่ยว';
            } else if (pmNum <= 50) {
                colorClass = 'green';
                introducetext = 'สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ';
            } else if (pmNum <= 100) {
                colorClass = 'yellow';
                introducetext = 'สามารถทำกิจกรรมกลางแจ้งได้ แต่ควรลดระยะเวลาทำกิจกรรมกลางแจ้ง';
            } else if (pmNum <= 200) {
                colorClass = 'orange';
                introducetext = 'ควรเฝ้าระวังสุขภาพ';
            } else {
                colorClass = 'red';
                introducetext = 'ควรหลีกเลี่ยงกิจกรรมกลางแจ้ง';
            }
            
            showPopup(pmValue, status, colorClass, introducetext);
        }

        // เมื่อหน้าเว็บโหลดเสร็จ
        window.onload = function() {
            // โหลดข้อมูลหลัก
            loadData();
            
            // ตรวจสอบว่ามี Firebase หรือไม่
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // แสดง popup อัตโนมัติเมื่อโหลดหน้าเสร็จ
                setTimeout(() => {
                    loadAndShowPopup();
                }, 1000); // รอ 1 วินาทีหลังจากโหลดข้อมูลเสร็จ
            } else {
                console.warn("Firebase ยังไม่ได้เริ่มต้น - แสดงข้อมูลทดสอบ");
                // แสดง popup ทดสอบ
                setTimeout(() => {
                    const testTimestamp = new Date();
                    const formattedTime = formatThaiDateTime(testTimestamp);
                    updateTimeDisplay(formattedTime);
                    const message = `ค่า PM 2.5 อยู่ที่ 201 μg/m³<br>สถานะ: แย่มาก<br><br>📅 อัปเดต: ${formattedTime}`;
                    showPopup(201, 'แย่มาก', 'red', message);
                }, 1500);
            }
        };

