// game/src/components/icons/navigation/index.js
export { IconChevronUp }    from './IconChevronUp.jsx';
export { IconChevronDown }  from './IconChevronDown.jsx';
export { IconChevronLeft }  from './IconChevronLeft.jsx';
export { IconChevronRight } from './IconChevronRight.jsx';
export { IconBurger }       from './IconBurger.jsx';
export { IconClose }        from './IconClose.jsx';

// Compat alias — old code imports `IconX`. Same component, kept for
// backward compatibility during migration. Remove once every import
// site uses `IconClose`.
export { IconClose as IconX } from './IconClose.jsx';