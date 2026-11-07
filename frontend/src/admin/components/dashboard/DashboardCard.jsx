export default function DashboardCard({
    title,
    value,
    description,
    icon: Icon,
    color = "blue",
    backgroundImage,
}) {

    const colorStyles = {

        blue: {
            icon: "bg-blue-100 text-blue-600",
            accent: "bg-blue-600",
        },

        green: {
            icon: "bg-green-100 text-green-600",
            accent: "bg-green-600",
        },

        purple: {
            icon: "bg-purple-100 text-purple-600",
            accent: "bg-purple-600",
        },

        orange: {
            icon: "bg-orange-100 text-orange-600",
            accent: "bg-orange-600",
        },

        emerald: {
            icon: "bg-emerald-100 text-emerald-600",
            accent: "bg-emerald-600",
        },

        yellow: {
            icon: "bg-yellow-100 text-yellow-600",
            accent: "bg-yellow-500",
        },

        cyan: {
            icon: "bg-cyan-100 text-cyan-600",
            accent: "bg-cyan-600",
        },

        red: {
            icon: "bg-red-100 text-red-600",
            accent: "bg-red-600",
        },

    };

    const selectedColor =
        colorStyles[color] || colorStyles.blue;

    return (

        <div
            className="
                relative
                overflow-hidden
                bg-white
                rounded-2xl
                border
                border-gray-100
                shadow-sm
                p-6
                transition-all
                duration-300
                hover:-translate-y-1
                hover:shadow-lg
                group
            "
            style={
                backgroundImage
                    ? {
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }
                    : {}
            }
        >

            {/* Left accent */}

            <div
                className={`
                    absolute
                    left-0
                    top-0
                    bottom-0
                    w-1
                    ${selectedColor.accent}
                `}
            />


            {/* Top section */}

            <div className="flex items-start justify-between">

                {/* Icon */}

                <div
                    className={`
                        w-12
                        h-12
                        rounded-xl
                        flex
                        items-center
                        justify-center
                        ${selectedColor.icon}
                        transition-transform
                        duration-300
                        group-hover:scale-110
                    `}
                >

                    {Icon && (
                        <Icon className="text-xl" />
                    )}

                </div>


                {/* More button */}

                <button
                    type="button"
                    className="
                        text-gray-300
                        hover:text-gray-600
                        text-xl
                        leading-none
                        transition
                    "
                >
                    ⋮
                </button>

            </div>


            {/* Card content */}

            <div className="mt-5">

                <p className="text-sm font-medium text-gray-500">

                    {title}

                </p>


                <h2 className="text-3xl font-bold text-gray-800 mt-1">

                    {value}

                </h2>


                {description && (

                    <p className="text-xs text-gray-400 mt-2">

                        {description}

                    </p>

                )}

            </div>

        </div>

    );
}