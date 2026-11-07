import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function WeightChart({ data }) {

    return (

        <ResponsiveContainer
            width="100%"
            height={300}
        >

            <LineChart data={data}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />

                <YAxis />

                <Tooltip />

                <Line
                    type="monotone"
                    dataKey="pre_weight"
                    name="Pre Weight"
                />

                <Line
                    type="monotone"
                    dataKey="post_weight"
                    name="Post Weight"
                />

            </LineChart>

        </ResponsiveContainer>

    );

}