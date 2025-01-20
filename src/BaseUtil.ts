class Vcalendar {
    version: string;
    prodId: string;
    name: string;
    refreshInterval: string;
    calScale: string;
    // Asia/Shanghai
    tzid: string;
    items: Vevent[];

    constructor(version: string, prodId: string, name: string, refreshInterval: string, calScale: string, tzid: string, items: Vevent[]) {
        this.version = version;
        this.prodId = prodId;
        this.name = name;
        this.refreshInterval = refreshInterval;
        this.calScale = calScale;
        this.tzid = tzid;
        this.items = items;
    }


    /**
     * 请不要将此函数当作通用函数，此函数可能仅适用于本项目
     * 详见 https://en.wikipedia.org/wiki/ICalendar
     * 详见 https://icalendar.org/iCalendar-RFC-5545
     */
    toString(): string {
        const lines = ['BEGIN:VCALENDAR'];
        lines.push('VERSION:' + this.version);
        lines.push('PRODID:' + this.prodId);
        lines.push('NAME:' + this.name);
        lines.push('REFRESH-INTERVAL;VALUE=DURATION:' + this.refreshInterval)
        lines.push('CALSCALE:' + this.calScale);
        lines.push('TZID:' + this.tzid);

        for (const i of this.items) {
            lines.push('BEGIN:VEVENT');
            lines.push('UID:' + i.uid);
            lines.push('DTSTAMP:' + i.dtstamp);

            const dtstart = i.dtstart.at(-1) === 'Z' ? i.dtstart.slice(0, -1) : i.dtstart;
            lines.push(`DTSTART;${dtstart.length === 8 ? 'VALUE=DATE' : 'TZID=' + this.tzid}:${dtstart}`);

            if (i.dtend) {
                const dtend = i.dtend.at(-1) === 'Z' ? i.dtend.slice(0, -1) : i.dtend;
                lines.push(`DTEND;${dtend.length === 8 ? 'VALUE=DATE' : 'TZID=' + this.tzid}:${dtend}`);
            }
            if (i.rrule) {
                lines.push(`RRULE:${i.rrule}`);
            }
            if (i.summary) {
                lines.push(`SUMMARY:${i.summary}`);
            }
            if (i.description) {
                lines.push(`DESCRIPTION:${i.description}`);
            }

            lines.push('END:VEVENT');
        }

        lines.push('END:VCALENDAR');
        return lines.join('\n');
    }


    /**
     * 请不要将此函数当作通用函数，此函数可能仅适用于本项目
     */
    static fromString(data: string): Vcalendar {
        const builder = new VcalendarBuilder();
        const items: Vevent[] = [];

        let inEvent = false;
        for (const i of data.split('\n')) {
            if (inEvent) {
                const item = items.at(-1)!;
                if (i.startsWith('UID:')) {
                    item.uid = i.slice('UID:'.length);
                } else if (i.startsWith('DTSTAMP:')) {
                    item.dtstamp = i.slice('DTSTAMP:'.length);
                } else if (i.startsWith('DTSTART;VALUE=')) {
                    const temp = i.slice('DTSTART;VALUE='.length);
                    item.dtstart = temp.slice(temp.indexOf(':') + 1);
                } else if (i.startsWith('DTEND;VALUE=')) {
                    const temp = i.slice('DTEND;VALUE='.length);
                    item.dtend = temp.slice(temp.indexOf(':') + 1);
                } else if (i.startsWith('RRULE:')) {
                    item.rrule = i.slice('RRULE:'.length);
                } else if (i.startsWith('SUMMARY:')) {
                    item.summary = i.slice('SUMMARY:'.length);
                } else if (i.startsWith('DESCRIPTION:')) {
                    item.description = i.slice('DESCRIPTION:'.length);
                } else if (i === 'END:VEVENT') {
                    inEvent = false;
                }
            } else {
                if (i.startsWith('VERSION:')) {
                    builder.setVersion(i.slice('VERSION:'.length));
                } else if (i.startsWith('PRODID:')) {
                    builder.setProdId(i.slice('PRODID:'.length));
                } else if (i.startsWith('NAME:')) {
                    builder.setName(i.slice('NAME:'.length));
                } else if (i.startsWith('REFRESH-INTERVAL;VALUE=DURATION:')) {
                    builder.setRefreshInterval(i.slice('REFRESH-INTERVAL;VALUE=DURATION:'.length));
                } else if (i.startsWith('CALSCALE:')) {
                    builder.setCalScale(i.slice('CALSCALE:'.length));
                } else if (i.startsWith('TZID:')) {
                    builder.setTzid(i.slice('TZID:'.length));
                } else if (i === 'BEGIN:VEVENT') {
                    inEvent = true;
                    items.push({
                        uid: crypto.randomUUID(),
                        dtstamp: dateToDateTime(new Date()),
                        dtstart: ''
                    });
                }
            }
        }

        builder.setItems(items);
        return builder.build();
    }
}

class VcalendarBuilder {
    version?: string;
    prodId?: string;
    name?: string;
    refreshInterval?: string;
    calScale?: string;
    tzid?: string;
    items: Vevent[] = [];


    setVersion(version: string) {
        this.version = version;
        return this;
    }
    setProdId(prodId: string) {
        this.prodId = prodId;
        return this;
    }
    setName(name: string) {
        this.name = name;
        return this;
    }
    setRefreshInterval(refreshInterval: string) {
        this.refreshInterval = refreshInterval;
        return this;
    }
    setCalScale(calScale: string) {
        this.calScale = calScale;
        return this;
    }
    setTzid(tzid: string) {
        this.tzid = tzid;
        return this;
    }
    setItems(items: Vevent[]) {
        this.items = items;
        return this;
    }
    build() {
        if (!this.version) throw new Error('version is required');
        if (!this.prodId) throw new Error('prodId is required');
        if (!this.name) throw new Error('name is required');
        if (!this.refreshInterval) throw new Error('refreshInterval is required');
        if (!this.calScale) throw new Error('calScale is required');
        if (!this.tzid) throw new Error('tzid is required');
        if (!this.items) throw new Error('items is required');

        return new Vcalendar(this.version, this.prodId, this.name, this.refreshInterval, this.calScale, this.tzid, this.items);
    }
}

type Vevent = {
    uid: string;
    dtstamp: string;
    dtstart: string;
    dtend?: string;
    rrule?: string;
    summary?: string;
    description?: string;
}

const timeout = (time: number) => new Promise(resolve => setTimeout(resolve, time));

function dateToDateTime(date: Date) {
    const iso = date.toISOString();
    return iso.slice(0, iso.lastIndexOf('.')).replaceAll('.', '').replaceAll('-', '').replaceAll(':', '') + 'Z';
}


export type {
    Vevent
}
export {
    Vcalendar,
    VcalendarBuilder,
    timeout,
    dateToDateTime
}