import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function CategoryIcon({ icon, color, size = 20, className = '' }) {
    const IconComponent = LucideIcons[icon] || LucideIcons.CircleDot;

    return (
        <div
            className={`flex items-center justify-center rounded-lg ${className}`}
            style={{ backgroundColor: color ? `${color}15` : '#f1f5f9' }}
        >
            <IconComponent
                style={{ color: color || '#64748b', width: size, height: size }}
            />
        </div>
    );
}
