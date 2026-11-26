# Lab 7: Software Maintenance Metrics & Release Readiness

> **วิชา:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026, Section 31)  
> **ทีม:** Team EN-011 (ExpenseFlow &mdash; Theme 5: Workflow & Approval System)  
> **สมาชิก:** Pattarawadee Thanapoomthakul (67070503435) & Siripitch Chaiyabutra (67070503440)  
> **กำหนดส่ง:** 29 พฤศจิกายน 2026 เวลา 23:59 น. ผ่าน LEB2 (100 คะแนนเต็ม, 5% of course grade)  
> **สถานะโครงการ:** ขั้นที่ 0 ขออนุมัติการเปลี่ยนกฎจากอาจารย์ผู้สอน/TA (Approval Phase)

---

## 1. วัตถุประสงค์ของ Lab 7 (Can you change it without breaking it?)
ขออนุมัติการเปลี่ยนแปลงกฎหรือพฤติกรรมใน Sprint 1 หนึ่งข้อ (Bounded Change) จากความต้องการที่เปลี่ยนไป (ไม่ใช่การแก้บั๊ก) วิเคราะห์ผลกระทบ ปรับปรุงสัญญาทางวิศวกรรมก่อนลงมือโค้ด (Contract-First) แสดงหลักฐาน RED/GREEN และส่งมอบผ่าน CI/CD โดยไม่กระทบพฤติกรรมเดิม

- **กฎที่เสนอเปลี่ยน:** `DEC-02` (เรื่องการเลือกตนเองเป็นผู้อนุมัติ)
  - **กฎเดิม (Sprint 1):** ยอมให้เลือกตนเองเป็นผู้อนุมัติได้ตอนสร้างคำขอ แล้วไปปฏิเสธด้วย HTTP 403 `SELF_APPROVAL` ตอนพิจารณา (`BR-01`)
  - **กฎใหม่ที่เสนอ (Lab 7):** ห้ามเลือกตนเองเป็นผู้อนุมัติตั้งแต่ตอนกดส่ง ระบบปฏิเสธด้วย HTTP 400 Bad Request (`SELF_APPROVAL_DISALLOWED` / `VALIDATION_ERROR`) และดักจับในหน้าแบบฟอร์ม UI
  - **สิ่งที่คงเดิม (Preserved Behavior):** การป้องกันที่ฝั่ง Reviewer (`BR-01` 403 Forbidden) ยังคงทำงานเป็น Defense-in-depth เหมือนเดิม

---

## 2. โครงสร้างโฟลเดอร์สำหรับการส่งมอบ (Directory Structure)

```
lab-07/
├── README.md                           # สรุปภาพรวมและสถานะของ Lab 7
├── 01-part-a-contract/                 # [Part A: 25 คะแนน] Change Request, การอนุมัติจาก TA, ตาราง Impact, สัญญาฉบับปรับปรุง
├── 02-part-b-delivery/                 # [Part B: 50 คะแนน] บันทึกผล RED/GREEN, Code Diff, Regression, CI/CD, Deployment
├── 03-part-c-metrics/                  # [Part C: 15 คะแนน] วิศวกรรมตัวชี้วัด 5 ตัว พร้อมหลักฐานและบทวิเคราะห์ไม่เกิน 100 คำ
├── 04-part-d-readiness/                # [Part D: 10 คะแนน] รายการประเมินความพร้อมปล่อย (Readiness Checklist), หนี้ทางเทคนิค, ถอดบทเรียน 3 ข้อ
└── evidence/                           # ภาพหลักฐานหน้าจอ, Console Logs, แชตอนุมัติจาก TA
```
