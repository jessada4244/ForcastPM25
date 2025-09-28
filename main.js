firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ฟังก์ชันโหลดและแสดง popup จาก Firebase
async function loadAndShowPopup() {
    try {
        console.log("กำลังโหลดข้อมูล PM2.5...");
        
        // ดึงข้อมูลจาก Firestore เรียงตาม timestamp จากใหม่ไปเก่า และเอาแค่ 1 document
        const querySnapshot = await db.collection("pm25_cmucc")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();
        
        if (!querySnapshot.empty) {
            // เอาข้อมูลล่าสุด
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            
            console.log("ข้อมูลล่าสุดที่ได้:", data);
            
            const pm25Value = parseFloat(data.pm25);
            const timestamp = data.timestamp;
            
            // กำหนดสถานะตามค่า PM2.5
            const result = getPMStatus(pm25Value);
            
            // แปลงเวลาเป็นรูปแบบไทย
            const formattedTime = formatThaiDateTime(timestamp);
            
            // อัปเดตข้อความเวลาใน update-time
            updateTimeDisplay(formattedTime);
            
            // สร้างข้อความสำหรับ popup
            const message = `${result.introducetext}`;
            
            console.log("แสดง popup ค่า PM2.5 ล่าสุด:", pm25Value);
            showPopup(pm25Value, result.status, result.colorClass, message);
            
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

// ฟังก์ชันกำหนดสถานะตามค่า PM2.5
function getPMStatus(pmValue) {
    const pmNum = parseFloat(pmValue);
    let status, colorClass, introducetext, backgroundColor;
    
    if (pmNum <= 25) {
        status = 'ดีมาก';
        colorClass = 'blue';
        backgroundColor = '#4FC3F7';
        introducetext = 'คุณภาพอากาศดีมาก เหมาะสำหรับกิจกรรมกลางแจ้ง และการท่องเที่ยว';
    } else if (pmNum <= 50) {
        status = 'ดี';
        colorClass = 'green';
        backgroundColor = '#66BB6A';
        introducetext = 'คุณภาพอากาศดี สามารถทำกิจกรรมกลางแจ้ง และการท่องเที่ยวได้ตามปกติ';
    } else if (pmNum <= 100) {
        status = 'ปานกลาง';
        colorClass = 'yellow';
        backgroundColor = '#FFCA28';
        introducetext = 'คุณภาพอากาศปานกลาง สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ ';
    } else if (pmNum <= 200) {
        status = 'ไม่ดี';
        colorClass = 'orange';
        backgroundColor = '#ff8c00';
        introducetext = 'คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ ควรเฝ้าระวังสุขภาพ ควรลดระยะเวลาการทำกิจกรรมกลางแจ้ง';
    } else {
        status = 'แย่มาก';
        colorClass = 'red';
        backgroundColor = '#EF5350';
        introducetext = 'คุณภาพอากาศมีผลกระทบต่อสุขภาพ ควรหลีกเลี่ยงกิจกรรมกลางแจ้ง ';
    }
    
    return { status, colorClass, introducetext, backgroundColor };
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
        // ดึงข้อมูลล่าสุดเพียง 1 document เรียงตาม timestamp จากใหม่ไปเก่า
        const querySnapshot = await db.collection("pm25_cmucc")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();
        
        if (querySnapshot.empty) {
            container.innerHTML = '<div class="loading">ไม่พบข้อมูล</div>';
            return;
        }

        // เอาข้อมูลล่าสุดเพียง document เดียว
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        console.log("ข้อมูลล่าสุดสำหรับแสดงผล:", data);
        
        // ตรวจสอบว่ามีข้อมูล pm25 หรือไม่
        if (data.pm25 !== undefined) {
            const html = `
                <div class="data-grid">
                    ${createPMCardHTML(doc.id, data.pm25, data.pm24, data.pm48, data.pm72, data.timestamp)}
                </div>
            `;
            container.innerHTML = html;
            
            // อัปเดตเวลาล่าสุดใน update-time
            if (data.timestamp) {
                const formattedTime = formatThaiDateTime(data.timestamp);
                updateTimeDisplay(formattedTime);
            }
        } else {
            container.innerHTML = '<div class="loading">ไม่มีข้อมูล PM2.5</div>';
        }
        
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", error);
        
        // ถ้า error เป็นเรื่อง index ให้แสดงข้อความแนะนำ
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            container.innerHTML = `
                <div class="error">
                    <strong>❌ ต้องสร้าง Index ใน Firestore:</strong><br>
                    กรุณาไปที่ Firebase Console > Firestore Database > Indexes<br>
                    และสร้าง composite index สำหรับ collection: pm25_cmucc<br>
                    Field: timestamp (Descending)<br><br>
                    หรือใช้คำสั่ง: <code>firebase firestore:indexes</code><br><br>
                    <small>รายละเอียดเพิ่มเติม: ${error.message}</small>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="error">
                    <strong>❌ เกิดข้อผิดพลาด:</strong><br>
                    ${error.message}<br><br>
                    <small>กรุณาตรวจสอบ Firebase Configuration และสิทธิ์การเข้าถึง</small>
                </div>
            `;
        }
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
// แสดงเวลา ณ ปัจจุบัน (ตามเครื่องผู้ใช้งาน)
function showCurrentTime() {
    const now = new Date();

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
        'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
        'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = now.getDate();
    const month = thaiMonths[now.getMonth()];
    const year = now.getFullYear() + 543;
    

    const formatted = `${day} ${month} ${year} `;

    const currentTimeElement = document.getElementById("current-time");
    if (currentTimeElement) {
        currentTimeElement.textContent = formatted;
    }
}

// อัปเดตเวลา ณ ปัจจุบันทุก 1 วินาที
setInterval(showCurrentTime, 1000);
showCurrentTime();


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

// ฟังก์ชันสร้าง HTML สำหรับแสดงค่า PM (แก้ไขให้ตรวจสอบแต่ละค่าแยกกัน)
function createPMCardHTML(docId, pmValue, pm24, pm48, pm72, timestamp) {
    // สร้าง HTML สำหรับแต่ละวงกลม โดยตรวจสอบเงื่อนไขแยกกัน
    const currentPM = getPMStatus(pmValue);
    const pm24Status = getPMStatus(pm24);
    const pm48Status = getPMStatus(pm48);
    const pm72Status = getPMStatus(pm72);

    
    return `
    <div class="air-container">

  <!-- วงกลมวันนี้ (ใหญ่) -->
  <div class="air-today">
        <div>
         <h3>คุณภาพอากาศวันนี้ </h3>
         <div>วันที่ <span id="current-time"></span></div>
        <div  class="circle-today" style="background-color: ${currentPM.backgroundColor} ;" onclick="showDetailPopup('${pmValue}', '${currentPM.status}')">
            <div>PM 2.5</div>
            <div class="pm-value" style="color: black; font-weight: bold; font-size: 2em;">${pmValue}</div>
            <div>${currentPM.status}</div>
        </div>
        </div>
        <!-- วงกลมชั่วโมง (เล็กกว่าหน่อย) -->
  <div class="air-hours">
        <div>
         <p>24 ชั่วโมง</p>
        <div class="circle" style="background-color: ${pm24Status.backgroundColor};" onclick="showDetailPopup('${pm24}', '${pm24Status.status}')">
            <div>PM 2.5</div>
            <div class="pm-value" style="color: black; font-weight: bold; font-size: 2em;">${pm24}</div>
            <div>${pm24Status.status}</div>
        </div>
         </div>
        <div>
         <p>48 ชั่วโมง</p>
        <div class="circle" style="background-color: ${pm48Status.backgroundColor};" onclick="showDetailPopup('${pm48}', '${pm48Status.status}')">
            <div>PM 2.5</div>
            <div class="pm-value" style="color: black; font-weight: bold; font-size: 2em;">${pm48}</div>
            <div>${pm48Status.status}</div>
        </div>
         </div>
        <div>
         <p>72 ชั่วโมง</p>
        <div class="circle" style="background-color: ${pm72Status.backgroundColor};" onclick="showDetailPopup('${pm72}', '${pm72Status.status}')">
            <div>PM 2.5</div>
            <div class="pm-value" style="color: black; font-weight: bold; font-size: 2em;">${pm72}</div>
            <div>${pm72Status.status}</div>
        </div>
        </div>
    `;
}

// ฟังก์ชันแสดง popup เมื่อคลิกที่วงกลม
function showDetailPopup(pmValue, status) {
    const result = getPMStatus(pmValue);
    showPopup(pmValue, status, result.colorClass, result.introducetext);
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
