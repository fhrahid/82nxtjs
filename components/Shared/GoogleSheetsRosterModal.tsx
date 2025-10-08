"use client";
import { useState, useMemo } from 'react';
import Modal from './Modal';

interface Employee {
  id: string;
  name: string;
  schedule: string[];
  team?: string;
  [k:string]: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  headers: string[];
  teams: Record<string, Employee[]>;
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

function detectAvailableMonths(headers: string[]): Set<string> {
  const months = new Set<string>();
  for (const h of headers) {
    const m = h.match(/[A-Za-z]+$/);
    if (m) {
      const key = m[0].slice(0,3).toLowerCase();
      if (MONTH_MAP[key] !== undefined) {
        months.add(key);
      }
    }
  }
  return months;
}

export default function GoogleSheetsRosterModal({ open, onClose, headers, teams }: Props) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);

  const teamNames = useMemo(() => Object.keys(teams || {}), [teams]);

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const selectAllTeams = () => {
    setSelectedTeams(teamNames);
  };

  const clearAllTeams = () => {
    setSelectedTeams([]);
  };

  // Calculate the current month being displayed
  const { displayHeaders, displayMonthName, canGoPrev, canGoNext } = useMemo(() => {
    const det = detectMonth(headers);
    const availableMonths = detectAvailableMonths(headers);
    const now = new Date();
    let monthIndex = det ? det.monthIndex : now.getMonth();
    
    // Apply month offset
    monthIndex += monthOffset;
    while (monthIndex < 0) {
      monthIndex += 12;
    }
    while (monthIndex > 11) {
      monthIndex -= 12;
    }
    
    const monthName = MONTH_NAME[monthIndex];
    const currentMonthKey = monthName.toLowerCase().slice(0, 3);
    
    // Filter headers to only show the current month
    const displayHeaders = headers.filter(h => {
      const m = h.match(/[A-Za-z]+$/);
      if (m) {
        const key = m[0].slice(0,3).toLowerCase();
        return key === currentMonthKey;
      }
      return false;
    });
    
    // Check if previous/next months have data
    const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
    const prevMonthKey = MONTH_NAME[prevMonthIndex].toLowerCase().slice(0, 3);
    const nextMonthKey = MONTH_NAME[nextMonthIndex].toLowerCase().slice(0, 3);
    
    const canGoPrev = availableMonths.has(prevMonthKey);
    const canGoNext = availableMonths.has(nextMonthKey);
    
    return { displayHeaders, displayMonthName: monthName, canGoPrev, canGoNext };
  }, [headers, monthOffset]);

  const filteredTeams = useMemo(() => {
    if (!teams) return {};
    if (selectedTeams.length === 0) return teams;
    
    const filtered: Record<string, Employee[]> = {};
    selectedTeams.forEach(teamName => {
      if (teams[teamName]) {
        filtered[teamName] = teams[teamName];
      }
    });
    return filtered;
  }, [teams, selectedTeams]);

  // Calculate column widths for sticky positioning
  const NAME_COL_W = 210;
  const ID_COL_W = 130;
  const TEAM_COL_W = 120;
  const DATE_COL_W = 120;

  // Get the header indices for the current month
  const displayHeaderIndices = useMemo(() => {
    return displayHeaders.map(h => headers.indexOf(h));
  }, [displayHeaders, headers]);

  return (
    <Modal open={open} onClose={onClose} title="Google Sheets Roster" width="90vw">
      <div className="google-sheets-roster-modal">
        {/* Month Navigation */}
        <div className="month-navigation">
          <button
            className="month-nav-btn"
            onClick={() => setMonthOffset(monthOffset - 1)}
            disabled={!canGoPrev}
            title="Previous Month"
          >
            ←
          </button>
          <div className="month-display">{displayMonthName}</div>
          <button
            className="month-nav-btn"
            onClick={() => setMonthOffset(monthOffset + 1)}
            disabled={!canGoNext}
            title="Next Month"
          >
            →
          </button>
        </div>

        {/* Team Filter Section */}
        <div className="filter-section">
          <div className="filter-header">
            <span className="filter-label">Team Filters:</span>
            <div className="filter-actions">
              <button className="filter-btn select-all" onClick={selectAllTeams}>
                Select All
              </button>
              <button className="filter-btn clear-all" onClick={clearAllTeams}>
                Clear All
              </button>
            </div>
          </div>
          <div className="team-chips">
            {teamNames.map(team => (
              <button
                key={team}
                className={`team-chip ${selectedTeams.includes(team) ? 'active' : ''}`}
                onClick={() => toggleTeam(team)}
              >
                {team}
              </button>
            ))}
          </div>
        </div>

        {/* Roster Table */}
        <div className="roster-table-container">
          <div className="roster-scroll-wrapper">
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="sticky-col name-col" style={{minWidth: NAME_COL_W}}>Employee</th>
                  <th className="sticky-col id-col" style={{left: NAME_COL_W, minWidth: ID_COL_W}}>ID</th>
                  <th className="sticky-col team-col" style={{left: NAME_COL_W + ID_COL_W, minWidth: TEAM_COL_W}}>Team</th>
                  {displayHeaders.map((header, i) => (
                    <th key={i} className="date-col" style={{minWidth: DATE_COL_W}}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredTeams).map(([teamName, employees]) =>
                  employees.map(emp => (
                    <tr key={emp.id}>
                      <td className="sticky-col name-col" style={{minWidth: NAME_COL_W}}>{emp.name}</td>
                      <td className="sticky-col id-col" style={{left: NAME_COL_W, minWidth: ID_COL_W}}>{emp.id}</td>
                      <td className="sticky-col team-col" style={{left: NAME_COL_W + ID_COL_W, minWidth: TEAM_COL_W}}>{teamName}</td>
                      {displayHeaderIndices.map((idx, i) => (
                        <td key={i} className="shift-cell" style={{minWidth: DATE_COL_W}}>
                          {emp.schedule[idx] || ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <style jsx>{`
          .google-sheets-roster-modal {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-height: 70vh;
          }

          .month-navigation {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            padding: 12px 16px;
            background: #0f1822;
            border: 1px solid #1f2e3b;
            border-radius: 10px;
          }

          .month-nav-btn {
            background: #1b2833;
            border: 1px solid #314252;
            border-radius: 6px;
            color: #93a7ba;
            padding: 8px 16px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: 0.18s;
            font-weight: 600;
            min-width: 50px;
          }

          .month-nav-btn:hover:not(:disabled) {
            background: #285072;
            border-color: #3d6a8d;
            color: #fff;
          }

          .month-nav-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .month-display {
            font-size: 1.1rem;
            font-weight: 600;
            color: #e1e8ef;
            letter-spacing: 1px;
            text-transform: uppercase;
            min-width: 120px;
            text-align: center;
          }

          .filter-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            background: #0f1822;
            border: 1px solid #1f2e3b;
            border-radius: 10px;
          }

          .filter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
          }

          .filter-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #85abc7;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .filter-actions {
            display: flex;
            gap: 8px;
          }

          .filter-btn {
            padding: 6px 14px;
            font-size: 0.7rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: 0.18s;
            border: 1px solid;
          }

          .filter-btn.select-all {
            background: #1e6b47;
            border-color: #2f8b60;
            color: #e8f3fa;
          }

          .filter-btn.select-all:hover {
            background: #258558;
          }

          .filter-btn.clear-all {
            background: #8f3e3e;
            border-color: #a34b4b;
            color: #e8f3fa;
          }

          .filter-btn.clear-all:hover {
            background: #a54848;
          }

          .team-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .team-chip {
            padding: 8px 16px;
            font-size: 0.75rem;
            border-radius: 20px;
            background: #1d2935;
            border: 1px solid #324556;
            color: #d5dee6;
            cursor: pointer;
            transition: 0.18s;
            font-weight: 500;
            letter-spacing: 0.3px;
          }

          .team-chip:hover {
            background: #253647;
            border-color: #3d5566;
          }

          .team-chip.active {
            background: #3a6599;
            border-color: #5e94d1;
            color: #fff;
            box-shadow: 0 0 0 2px rgba(94, 148, 209, 0.28);
            font-weight: 600;
          }

          .roster-table-container {
            flex: 1;
            overflow: hidden;
            border: 1px solid #1f2e3b;
            border-radius: 10px;
            background: #0f1822;
          }

          .roster-scroll-wrapper {
            overflow: auto;
            max-height: 50vh;
            width: 100%;
          }

          .roster-scroll-wrapper::-webkit-scrollbar {
            height: 14px;
            width: 14px;
          }

          .roster-scroll-wrapper::-webkit-scrollbar-track {
            background: #0b141c;
          }

          .roster-scroll-wrapper::-webkit-scrollbar-thumb {
            background: #254253;
            border-radius: 10px;
            border: 3px solid #0b141c;
          }

          .roster-scroll-wrapper::-webkit-scrollbar-thumb:hover {
            background: #2f5770;
          }

          .roster-table {
            border-collapse: separate;
            border-spacing: 0;
            font-size: 0.7rem;
            color: #d1dae2;
            width: max-content;
            min-width: 100%;
          }

          .roster-table thead th {
            position: sticky;
            top: 0;
            background: #182a37;
            color: #85abc7;
            font-weight: 600;
            font-size: 0.58rem;
            letter-spacing: 0.65px;
            padding: 10px 10px;
            border-bottom: 1px solid #284152;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 6;
            text-align: center;
          }

          .roster-table tbody td {
            background: #122431;
            padding: 9px 8px;
            border-bottom: 1px solid #223a4a;
            border-right: 1px solid #223a4a;
            text-align: center;
            white-space: nowrap;
            font-weight: 500;
            letter-spacing: 0.4px;
          }

          .roster-table tbody tr:nth-child(odd) td {
            background: #10202b;
          }

          .roster-table tbody tr:hover td {
            background: #1a3442;
          }

          .sticky-col {
            position: sticky;
            left: 0;
            z-index: 10;
            background: #182a37 !important;
            box-shadow: 2px 0 0 #223b4a;
          }

          .sticky-col.id-col {
            z-index: 11;
          }

          .sticky-col.team-col {
            z-index: 12;
          }

          /* Override background for sticky columns on hover */
          .roster-table tbody tr:hover .sticky-col {
            background: #1f3544 !important;
          }

          .roster-table tbody tr:nth-child(odd) .sticky-col {
            background: #172936 !important;
          }

          .roster-table tbody tr:nth-child(odd):hover .sticky-col {
            background: #1f3544 !important;
          }
        `}</style>
      </div>
    </Modal>
  );
}
