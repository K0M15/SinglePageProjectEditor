import { elementBuilder } from "./builtinPanels"
import { addGlobalStyle } from "./GlobalStyles";

export class DatePicker extends HTMLElement{
    input:HTMLInputElement;
    calendar:HTMLDivElement;
    today:Date;
    selectedDate: Date | null;
    currentMonth:number;
    currentYear:number;
    container:HTMLDivElement;
    constructor(){
        super()
    }

    connectedCallback() {
        const shadow = this.attachShadow({mode:"open"});
        addGlobalStyle(shadow, "datePicker.css");
        this.container = shadow.appendChild(elementBuilder('div', {}));
        this.today = new Date();
        this.selectedDate = null;
        this.currentMonth = this.today.getMonth();
        this.currentYear = this.today.getFullYear();
        this.input = elementBuilder("input", {
            onClick:() => {
                this.calendar.classList.remove("hidden");
                this.renderCalendar(this.currentYear, this.currentMonth);
                // add document event handler on click outside of calender Element
            }
        });
        this.input.type = "text";
        this.input.placeholder = "YYYY-MM-DD"
        this.input.readOnly = true;
        const icon = elementBuilder("span", {
            classList: ["datepicker-icon"],
            innerText: "📅",
            parent:this,
        })
        this.calendar = elementBuilder("div", {
            classList: ["calender-popup", "hidden"],
        });
        this.container.appendChild(this.input);
        this.container.appendChild(this.calendar);
        this.renderCalendar(this.currentYear, this.currentMonth);
        document.addEventListener("click", (event) => {
            if (!this.contains(event.target as Node)) {
                this.calendar.classList.add("hidden");
            }
        });
    }

    renderCalendar(year:number, month:number){
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        let html = `
        <div class="calendar-nav">
            <button class="prev-month">‹</button>
            <div class="calendar-header">${monthNames[month]} ${year}</div>
            <button class="next-month">›</button>
        </div>
        <table>
            <tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr>
            <tr>
        `;
        for (let i = 0; i < firstDay; i++) {
            html += `<td></td>`;
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(year, month, d).getDay();
            html += `<td class="calendar-day" data-year="${year}" data-month="${month}" data-day="${d}">${d}</td>`;
            if (day === 6 && d !== daysInMonth)
                html += `</tr><tr>`;
        }
        html += `</tr></table>`;
        this.calendar.innerHTML = html;

        this.calendar.querySelectorAll('.calendar-day').forEach(td => {
            td.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const y = Number(target.getAttribute('data-year'));
                const m = Number(target.getAttribute('data-month'));
                const d = Number(target.getAttribute('data-day'));
                this.selectDate(y, m, d);
            });
        });

        this.calendar.querySelector('.prev-month')?.addEventListener('click', () => this.changeMonth(-1));
        this.calendar.querySelector('.next-month')?.addEventListener('click', () => this.changeMonth(1));
    }

    selectDate(year:number, month:number, day:number) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        this.input.value = dateStr;
        this.calendar.style.display = 'none';
    }
    
    changeMonth(offset:number) {
    this.currentMonth += offset;
    if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.renderCalendar(this.currentYear, this.currentMonth);
  }
}