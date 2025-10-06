"use client";
import { useMemo } from 'react';

interface Props {
  headers: string[];
  selectedDate?: string;
  onSelect?: (date: string) => void;
  yearHint?: number;
  showWeekdays?: boolean;
}

const MONTH_MAP: Record<string, number> = {
  jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
};
const MONTH_NAME: Record<number,string> = {
  0:"Jan",1:"Feb",2:"Mar",3:"Apr",4:"May",5:"Jun",6:"Jul",7:"Aug",8:"Sep",9:"Oct",10:"Nov",11:"Dec"
};

function detectMonth(headers: string[]): {monthIndex:number, name:string}|null {
  for (const h of headers) {
    const m = h.match(/[A-Za-z]+$/);
    if (m) {
      const key = m[0].slice(0,3).toLowerCase();
      if (MONTH_MAP[key] !== undefined) {
        const idx = MONTH_MAP[key];
        return {monthIndex: idx, name: MONTH_NAME[idx]};
      }
    }
  }
  return null;
}

export default function MonthCompactCalendar({
  headers,
  selectedDate,
  onSelect,
  yearHint,
  showWeekdays = true
}: Props) {

  const { weeks, monthName } = useMemo(()=>{
    const det = detectMonth(headers);
    const now = new Date();
    const year = yearHint || now.getFullYear();
    const monthIndex = det ? det.monthIndex : now.getMonth();
    const monthName = det ? det.name : MONTH_NAME[monthIndex];

    const lastDay = new Date(year, monthIndex+1, 0).getDate();
    const days = Array.from({length:lastDay}, (_,i)=> i+1);

    interface DayCell { label: string; headerKey: string; day: number; weekday: number; }
    const monthHeader = monthName;
    const dayCells: DayCell[] = days.map(day=>{
      const headerKey = `${day}${monthHeader}`;
      const d = new Date(year, monthIndex, day);
      return {
        label: String(day),
        headerKey,
        day,
        weekday: d.getDay()
      };
    });

    const weeks: DayCell[][] = [];
    let currentWeek: (DayCell | null)[] = [];

    const firstWeekday = dayCells[0]?.weekday ?? 0;
    for (let i=0;i<firstWeekday;i++) currentWeek.push(null);

    dayCells.forEach(cell=>{
      currentWeek.push(cell);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek as DayCell[]);
        currentWeek = [];
      }
    });
    if (currentWeek.length>0) {
      while (currentWeek.length<7) currentWeek.push(null);
      weeks.push(currentWeek as DayCell[]);
    }

    return { weeks, monthName };
  },[headers, yearHint]);

  const handleSelect = (key:string) => {
    if (onSelect) onSelect(key);
  };

  return (
    <div className="mc-month-calendar large">
      <div className="mc-header-row">
        <div className="mc-month-title">{monthName}</div>
      </div>
      {showWeekdays && (
        <div className="mc-weekdays">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(
            <div key={d} className="mc-weekday">{d}</div>
          ))}
        </div>
      )}
      <div className="mc-weeks">
        {weeks.map((week,wi)=>(
          <div className="mc-week" key={wi}>
            {week.map((cell,ci)=>{
              if (!cell) return <div key={ci} className="mc-day empty" />;
              const isActive = headers.includes(cell.headerKey);
              const isSelected = cell.headerKey === selectedDate;
              return (
                <button
                  key={ci}
                  type="button"
                  className={`mc-day ${isActive?'active':''} ${isSelected?'selected':''}`}
                  onClick={()=> isActive && handleSelect(cell.headerKey)}
                  disabled={!isActive}
                  title={cell.headerKey}
                >
                  <span className="mc-day-number">{cell.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <style jsx>{`
        .mc-month-calendar.large {
          background:#121b24;
          border:1px solid #2d3d4c;
          border-radius:14px;
          padding:14px 16px 18px;
          width:100%;
          box-sizing:border-box;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .mc-header-row { display:flex; justify-content:center; }
        .mc-month-title {
          font-size:.9rem;
          letter-spacing:1px;
          font-weight:600;
          color:#e1e8ef;
          text-transform:uppercase;
        }
        .mc-weekdays {
          display:grid;
          grid-template-columns:repeat(7,1fr);
          gap:6px;
        }
        .mc-weekday {
          text-align:center;
            font-size:.65rem;
          letter-spacing:.5px;
          color:#93a7ba;
          padding:2px 0;
          font-weight:500;
        }
        .mc-weeks { display:flex; flex-direction:column; gap:6px; }
        .mc-week {
          display:grid;
          grid-template-columns:repeat(7,1fr);
          gap:6px;
        }
        .mc-day {
          position:relative;
          background:#1b2833;
          border:1px solid #314252;
          border-radius:8px;
          height:52px;
          font-size:.8rem;
          color:#6f879d;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition:.18s;
          padding:0;
          font-weight:500;
        }
        .mc-day.active { color:#d5e1ec; }
        .mc-day:hover.active {
          background:#285072;
          border-color:#3d6a8d;
          color:#fff;
        }
        .mc-day.selected {
          background:#3b6ea7;
          border-color:#74a8e7;
          color:#fff;
          font-weight:700;
          box-shadow:0 0 0 2px rgba(90,140,200,.25);
        }
        .mc-day.empty {
          background:transparent;
          border:none;
          cursor:default;
        }
        .mc-day:disabled { opacity:.3; cursor:default; }
        .mc-day-number { position:relative; z-index:2; }
      `}</style>
    </div>
  );
}