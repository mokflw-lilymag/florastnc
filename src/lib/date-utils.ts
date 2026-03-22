/**
 * Date parsing utility for handling ISO strings and Date objects
 */

export function parseDate(date: any): Date {
    if (!date) return new Date();

    if (date instanceof Date) return date;

    if (typeof date === 'string') {
        let parsed = new Date(date);
        if (isNaN(parsed.getTime()) && date.includes(' ')) {
            const isoLike = date.replace(' ', 'T');
            parsed = new Date(isoLike);
        }
        if (isNaN(parsed.getTime())) {
            const datePart = date.split(' ')[0];
            if (datePart.includes('-')) {
                parsed = new Date(datePart);
            }
        }
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    if (typeof date === 'number') {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    if (typeof date === 'object' && date !== null) {
        if (typeof date.toDate === 'function') {
            return date.toDate();
        }
        if ('_seconds' in date) {
            return new Date(date._seconds * 1000);
        }
        if ('seconds' in date) {
            return new Date(date.seconds * 1000);
        }
    }

    return new Date();
}

export function toISOString(date: any): string | null {
    const parsed = parseDate(date);
    return parsed ? parsed.toISOString() : null;
}

export function toLocaleDateString(date: any, locale: string = 'ko-KR'): string {
    const parsed = parseDate(date);
    return parsed ? parsed.toLocaleDateString(locale) : '-';
}

export function isValidDate(date: any): boolean {
    if (!date) return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
}
