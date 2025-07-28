package relics.reliceApi.model;

import lombok.Getter;
import lombok.Setter;

import java.util.List;


@Getter
@Setter
public class Relic {
    private String reliceName;
    private String tier;
    private String state;
    private List<Drop> drops;

    @Override
    public String toString() {
        return "relic{" +
                "reliceName='" + reliceName + '\'' +
                ", tier='" + tier + '\'' +
                ", state='" + state + '\'' +
                ", drops=" + drops +
                '}';
    }
}
